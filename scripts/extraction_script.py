import pandas as pd
import requests
import openai
from openai import OpenAI
from itertools import product
import os
import PyPDF2
from io import BytesIO

# Load the Excel file
input_excel_file = 'C:\\Users\\giorg\\Desktop\\database\\first_attempt\\parataseis_kiriksewn.xlsx'
output_excel_file = 'C:\\Users\\giorg\\Desktop\\database\\first_attempt\\parataseis_kiriksewn_output.xlsx'
df = pd.read_excel(input_excel_file)

client = OpenAI(
    # This is the default and can be omitted
    api_key='****',
)

    
def fetch_pdf(link):
    try:
        response = requests.get(link)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Load PDF into a PdfFileReader object
        pdf_file = BytesIO(response.content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Extract text from each page
        text = ""
        for page in range(len(pdf_reader.pages)):
            text += pdf_reader.pages[page].extract_text() + "\n"
        
        #print(text)
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch document from {link}. Error: {e}")
    except Exception as e:
        print(f"Failed to read PDF. Error: {e}")

    return text

def parse_response(response_message):
    data = {}
    lines = response_message.split('\n')
    for line in lines:
        line = line.strip('- ').strip()  # Remove leading hyphens and extra whitespace
        if ':' in line:
            key, value = line.split(':', 1)
            data[key.strip()] = value.strip().split(', ') if key.strip() in ['Location', 'Disaster Type'] else value.strip()
    return data

def extract_values_from_document(document_text):
    system_message = {"role": "system", 
                      "content": '''You are a Greek Document Data Extractor. Your objective is to extract specific data from Greek documents and present the data in key-value pairs consistently.

                        Instructions:
                        1. Location: The geographical location of the event. Extract only the most specific location found and not the broarder area. If there is more than one location list them separated by commas.
                        2. Disaster Type: The type of disaster. Match the disaster to one or more from the provided list, separated by commas.
                        Disasters: Σεισμός, Πλημμύρα, Πυρκαγιά, Βροχόπτωση, Καταιγίδα, Άνεμοι, Παγετός, Χιονόπτωση, Χαλαζόπτωση, Κατολίσθηση, Ανεμοστρόβιλος, Διάβρωση, Ρύπανση, Ευλογιά προβάτων, Ορθόπτερα, Διακοπή Ηλεκτρικού Ρεύματος, Εκρηκτική ύλη, Καύσωνας, Κεραυνός, Καθίζηση, Υπερβολικό ψύχος, Ξηρασία, Τσουνάμι, Ηφαίστειο, Σταγονίδια Θαλασσινού Νερού, Ρευστοποίηση, Παράκτια Πλημμύρα, Ποτάμια Πλημμύρα
                        3. Event Date: The date when the event occurred in dd/mm/yyyy format.
                        4. Event End Date: The date when the event ended, if not provided use the same as the Event Date, in dd/mm/yyyy format.
                        5. Alert Start Date: The date when the emergency alert extension for the event started in dd/mm/yyyy format.
                        6. Alert End Date: The date when the emergency alert extension for the event ended. If not provided, calculate it from the Alert Start Date given plus the duration, in dd/mm/yyyy format.

                        Output Format:
                        Location: [Most specific location(s)]
                        Disaster Type: [Disaster type(s)]
                        Event Date: [dd/mm/yyyy]
                        Event End Date: [dd/mm/yyyy]
                        Alert Start Date: [dd/mm/yyyy]
                        Alert End Date: [dd/mm/yyyy]'''
                    }
    user_message = {"role": "user", "content": document_text}
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            system_message,
            user_message
        ]
    )
    response_message = response.choices[0].message.content
    
    return system_message, user_message, response_message

def process_document(link, row):
    document_text = fetch_pdf(link)
    
    if document_text:
        system_message, user_message, response_message = extract_values_from_document(document_text)
        print(response_message)
        # Log the interaction
        log_entry = {
            "system": system_message,
            "user": user_message,
            "response": response_message
        }
        
        # Parse the extracted values (Assuming JSON format)
        try:
            extracted_data = parse_response(response_message)
            locations = extracted_data.get('Location', [])
            disasters = extracted_data.get('Disaster Type', [])
            
            # Generate combinations of locations and disasters
            combinations = list(product(locations, disasters))
            total_combinations = len(combinations)
            
            # Create new entries for each combination
            new_entries = []
            for i, (location, disaster) in enumerate(combinations):
                new_entry = row.copy()
                new_entry['SpatialRef_FK'] = location
                new_entry['DisasterType_FK'] = disaster
                new_entry['EventDate'] = extracted_data.get('Event Date')
                new_entry['EventEndDate'] = extracted_data.get('Event End Date')
                new_entry['AlertStartDate'] = extracted_data.get('Alert Start Date')
                new_entry['AlertEndDate'] = extracted_data.get('Alert End Date')
                new_entry['index_n'] = i + 1
                new_entry['index_from'] = total_combinations
                new_entry['DiscoveryLog'] = str(log_entry)  # Store the log as a string
                new_entries.append(new_entry)
            return new_entries
        except Exception as e:
            print(f"Error parsing response for row {row['index']}: {e}")
            new_entry = row.copy()
            new_entry['log'] = str({"error": f"Error parsing response: {e}"})
            return [new_entry]
    else:
        new_entry = row.copy()
        new_entry['log'] = str({"error": "Failed to fetch document"})
        return [new_entry]

# Initialize a list to store new entries
all_new_entries = []

# Iterate over each row in the dataframe
for index, row in df.iterrows():
    link = row['infoSourceLink']
    
    if pd.notna(link):
        try:
            new_entries = process_document(link, row)
            all_new_entries.extend(new_entries)
        except Exception as e:
            print(f"Error processing document for row {index}: {e}")
            new_entry = row.copy()
            new_entry['log'] = str({"error": f"Error processing document: {e}"})
            all_new_entries.append(new_entry)
    else:
        new_entry = row.copy()
        new_entry['log'] = str({"error": "No document link provided"})
        all_new_entries.append(new_entry)

# Create a new dataframe with the new entries
new_df = pd.DataFrame(all_new_entries)

# Save the new dataframe to a new Excel file
new_df.to_excel(output_excel_file, index=False)

print("Process completed and new Excel file created.")






"""You are a Greek Document Data Extractor. Your objective is to extract specific data from Greek documents and present the data in key-value pairs consistently.

                        Instructions:
                        1. Location: The geographical location of the event. Extract only the most specific location found and not the broarder area. If there is more than one location list them separated by commas.
                        2. Disaster Type: The type of disaster. Match the disaster to one or more from the provided list, separated by commas.
                        Disasters: Σεισμός, Πλημμύρα, Πυρκαγιά, Βροχόπτωση, Καταιγίδα, Άνεμοι, Παγετός, Χιονόπτωση, Χαλαζόπτωση, Κατολίσθηση, Ανεμοστρόβιλος, Διάβρωση, Ρύπανση, Ευλογιά προβάτων, Ορθόπτερα, Διακοπή Ηλεκτρικού Ρεύματος, Εκρηκτική ύλη, Καύσωνας, Κεραυνός, Καθίζηση, Υπερβολικό ψύχος, Ξηρασία, Τσουνάμι, Ηφαίστειο, Σταγονίδια Θαλασσινού Νερού, Ρευστοποίηση, Παράκτια Πλημμύρα, Ποτάμια Πλημμύρα
                        3. Event Date: The date when the event occurred in dd/mm/yyyy format.
                        4. Event End Date: The date when the event ended, if not provided use the same as the Event Date, in dd/mm/yyyy format.
                        5. Alert Start Date: The date when the emergency alert for the event started in dd/mm/yyyy format.
                        6. Alert End Date: The date when the emergency alert for the event ended. If not provided, calculate it from the Alert Start Date given plus the duration, in dd/mm/yyyy format.

                        Output Format:
                        Location: [Most specific location(s)]
                        Disaster Type: [Disaster type(s)]
                        Event Date: [dd/mm/yyyy]
                        Event End Date: [dd/mm/yyyy]
                        Alert Start Date: [dd/mm/yyyy]
                        Alert End Date: [dd/mm/yyyy]"""


#elga
"""You are a Greek Document Data Extractor. You are given a newspaper and at some point it refers to a natural disaster that happened in Greece. Your objective is to extract specific data about the disaster from Greek documents and present the data in key-value pairs consistently.

                        Instructions:
                        1. Location: The geographical location of the event. Extract only the most specific location found and not the broarder area. If there is more than one location list them separated by commas.
                        2. Disaster Type: The type of disaster. Match the disaster to one or more from the provided list, separated by commas.
                        Disasters: Σεισμός, Πλημμύρα, Πυρκαγιά, Βροχόπτωση, Καταιγίδα, Άνεμοι, Παγετός, Χιονόπτωση, Χαλαζόπτωση, Κατολίσθηση, Ανεμοστρόβιλος, Διάβρωση, Ρύπανση, Ευλογιά προβάτων, Ορθόπτερα, Διακοπή Ηλεκτρικού Ρεύματος, Εκρηκτική ύλη, Καύσωνας, Κεραυνός, Καθίζηση, Υπερβολικό ψύχος, Ξηρασία, Τσουνάμι, Ηφαίστειο, Σταγονίδια Θαλασσινού Νερού, Ρευστοποίηση, Παράκτια Πλημμύρα, Ποτάμια Πλημμύρα
                        3. Event Date: The date when the event occurred in dd/mm/yyyy format.
                        4. Event End Date: The date when the event ended, if not provided use the same as the Event Date, in dd/mm/yyyy format.
                        

                        Output Format:
                        Location: [Most specific location(s)]
                        Disaster Type: [Disaster type(s)]
                        Event Date: [dd/mm/yyyy]
                        Event End Date: [dd/mm/yyyy]
                        Publish Date: [dd/mm/yyyy]"""