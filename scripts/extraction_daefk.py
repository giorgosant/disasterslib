import os
import pandas as pd
import openai
from openai import OpenAI
import PyPDF2
from itertools import product

# Define the directory containing the PDFs
pdf_folder = 'C:\\Users\\giorg\\Desktop\\database\\test-data\\PDF-DAEFK\\gdaefk_fek\\pdf\\all_years'
output_excel_file = 'C:\\Users\\giorg\\Desktop\\database\\test-data\\PDF-DAEFK\\gdaefk_fek\\pdf\\results.xlsx'

client = OpenAI(
    api_key='****',
)

def extract_text_from_pdf(pdf_path):
    """Extract text only from the first page of a PDF file."""
    text = ""
    try:
        with open(pdf_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            if len(pdf_reader.pages) > 0:  # Check if the document has at least one page
                text = pdf_reader.pages[0].extract_text()  # Extract only the first page
    except Exception as e:
        print(f"Failed to read PDF {pdf_path}. Error: {e}")
    return text

def extract_values_from_document(document_text):
    """Send document text to OpenAI for structured extraction."""
    system_message = {"role": "system", 
                      "content": """You are a Greek Document Data Extractor. You are given a newspaper and at some point it refers to a natural disaster that happened in Greece. Your objective is to extract specific data about the disaster from Greek documents and present the data in key-value pairs consistently.

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
                    }
    user_message = {"role": "user", "content": document_text}

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[system_message, user_message]
    )
    
    return system_message, user_message, response.choices[0].message.content

def parse_response(response_message):
    """Parse extracted response into structured data."""
    data = {}
    lines = response_message.split('\n')
    for line in lines:
        line = line.strip('- ').strip()  # Remove leading hyphens and extra whitespace
        if ':' in line:
            key, value = line.split(':', 1)
            data[key.strip()] = value.strip().split(', ') if key.strip() in ['Location', 'Disaster Type'] else value.strip()
    return data

# Initialize a list to store extracted data
all_new_entries = []

# Process each PDF file in the folder
for filename in os.listdir(pdf_folder):
    if filename.endswith(".pdf"):
        pdf_path = os.path.join(pdf_folder, filename)
        print(f"Processing: {pdf_path}")

        # Extract text from the PDF
        document_text = extract_text_from_pdf(pdf_path)

        if document_text:
            # Get extracted information from OpenAI
            system_message, user_message, response_message = extract_values_from_document(document_text)
            extracted_data = parse_response(response_message)

            locations = extracted_data.get('Location', [])
            disasters = extracted_data.get('Disaster Type', [])
            
            # Generate combinations of locations and disasters
            combinations = list(product(locations, disasters))
            total_combinations = len(combinations)

            # Log entry for tracking AI interactions
            log_entry = {
                "system": system_message,
                "user": user_message,
                "response": response_message
            }

            # Create a dictionary with the extracted values
            for i, (location, disaster) in enumerate(combinations):
                new_entry = {
                    'SpatialRef_FK': location,
                    'DisasterType_FK': disaster,
                    'EventDate': extracted_data.get('Event Date', 'N/A'),
                    'EventEndDate': extracted_data.get('Event End Date', 'N/A'),
                    'PublishDate': extracted_data.get('Publish Date', 'N/A'),
                    'index_n': i + 1,
                    'index_from': total_combinations,
                    'DiscoveryLog': str(log_entry),  # Store the log as a string
                    'link': filename,  # Storing filename under "link" field
                }
                all_new_entries.append(new_entry)

# Create a new DataFrame with the extracted information
new_df = pd.DataFrame(all_new_entries)

# Save the extracted data to an Excel file
new_df.to_excel(output_excel_file, index=False)

print("Process completed and new Excel file created.")
