import pandas as pd
import re
import unicodedata
from fuzzywuzzy import process, fuzz

# Load the Excel files
events_file_path = 'C:\\Users\\giorg\\Desktop\\database\\first_attempt\\results.xlsx'
locations_file_path = 'C:\\Users\\giorg\\Desktop\\database\\first_attempt\\spatial_reference.xlsx'
disaster_types_file_path = 'C:\\Users\\giorg\\Desktop\\database\\Correspondence_NaturalDisasters_UN.xlsx'

# Read the data
events_df = pd.read_excel(events_file_path, sheet_name='Sheet1')
locations_df = pd.read_excel(locations_file_path, sheet_name='Sheet1')
disaster_types_df = pd.read_excel(disaster_types_file_path, sheet_name='Sheet1')

# Remove everything after a comma in the 'elstatlektiko' column of the locations_df
locations_df['elstatlektiko'] = locations_df['elstatlektiko'].str.split(',', n=1).str[0]

# Define a dictionary for phrase replacements
replacements = {
    'Π.Ε.': 'ΠΕΡΙΦΕΡΕΙΑΚΗ ΕΝΟΤΗΤΑ',
    'Δ.Ε.': 'ΔΗΜΟΤΙΚΗ ΕΝΟΤΗΤΑ',
    'Δ.Κ.': 'Δημοτική Κοινότητα',
    'Τ.Κ.': 'Τοπική Κοινότητα',
    'Αγ.' : 'Αγιος'
}

# Apply replacements to the relevant column (e.g., 'SpatialRef_Source(chatGPT)')
events_df['SpatialRef_Source(chatGPT)'] = events_df['SpatialRef_Source(chatGPT)'].replace(replacements, regex=True)

# Function to remove accents from Greek (and other) characters
def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return ''.join([c for c in nfkd_form if not unicodedata.combining(c)])

# Preprocessing function to clean Greek strings: lowercasing, removing special characters, keeping spaces and periods
def clean_string(s):
    # Remove accents before further processing
    s = remove_accents(s)
    # Match Greek letters, English letters, numbers, spaces, and periods
    cleaned = re.sub(r'[^a-zA-Z0-9\s.\u0370-\u03FF\u1F00-\u1FFF]', '', s).lower().strip()  # Unicode range for Greek letters
    # If the string is empty after cleaning, return a placeholder or the original string
    return cleaned if cleaned else 'UNKNOWN'

# Clean the columns in the dataframes
events_df['cleaned_location'] = events_df['SpatialRef_Source(chatGPT)'].apply(clean_string)
locations_df['cleaned_location'] = locations_df['elstatlektiko'].apply(clean_string)

# Define a function to apply fuzzy matching with a threshold
def get_closest_match(location, choices_df, threshold=70):
    choices = choices_df['cleaned_location'].tolist()
    match = process.extractOne(location, choices, scorer=fuzz.token_set_ratio)
    if match and match[1] >= threshold:
        matched_name = choices_df[choices_df['cleaned_location'] == match[0]]['elstatlektiko'].values[0]
        matched_id = choices_df[choices_df['cleaned_location'] == match[0]]['id'].values[0]
        return matched_name, matched_id
    return None, None

# Apply fuzzy matching to the 'SpatialRef_Source(chatGPT)' column and get the corresponding ID and Name
events_df[['SpatialRef_Name', 'SpatialRef_FK']] = events_df['cleaned_location'].apply(
    lambda loc: pd.Series(get_closest_match(loc, locations_df)))

# Define a function to match the disaster type ID based on 'short_title'
def get_disaster_type_id(disaster_type, disaster_types_df):
    match = disaster_types_df.loc[disaster_types_df['short_title'] == disaster_type, 'id']
    return match.values[0] if not match.empty else None

# Apply matching to the 'DisasterType_Source(chatGPT)' column to get the corresponding ID
events_df['DisasterType_FK'] = events_df['DisasterType_Source(chatGPT)'].apply(
    get_disaster_type_id, args=(disaster_types_df,))

# Check for unmatched locations
unmatched_locations = events_df[events_df['SpatialRef_Name'].isnull()]
if not unmatched_locations.empty:
    print("Unmatched Locations:")
    print(unmatched_locations[['SpatialRef_Source(chatGPT)']])

# Debugging: Print the first few rows to check the matched results
print("Matched DataFrame Head:")
print(events_df[['SpatialRef_Source(chatGPT)', 'SpatialRef_Name', 'SpatialRef_FK','DisasterType_FK']].head())

# Save the updated dataframe to a new Excel file
updated_file_path = 'C:\\Users\\giorg\\Desktop\\database\\first_attempt\\updated_results.xlsx'
events_df.to_excel(updated_file_path, index=False)

print(f"Updated file saved to {updated_file_path}")
