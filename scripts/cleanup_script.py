import pandas as pd

# Load the dataset
def load_data(file_path, sheet_name):
    return pd.read_excel(file_path, sheet_name=sheet_name)

# Cleanup function
def clean_data(df):
    # Define additional placeholders for missing values
    placeholders = ["undefined", "N/A", "", None, pd.NA]
    
    # Replace placeholders with NaN
    df.replace(placeholders, pd.NA, inplace=True)
    
    # Drop rows with missing values in specified columns
    columns_to_check = ['SpatialRef_FK', 'SpatialRef_Name', 'DisasterType_FK', 
                        'DisasterType_Source(chatGPT)', 'EventDate','PublishDate']
    df = df.dropna(subset=columns_to_check)
    return df

# Save the cleaned data
def save_data(df, output_file_path):
    df.to_excel(output_file_path, index=False)

if __name__ == "__main__":
    # Input and output file paths
    input_file_path = "C:\\Users\\giorg\\Desktop\\database\\first_attempt\\updated_results.xlsx"
    output_file_path = "C:\\Users\\giorg\\Desktop\\database\\first_attempt\\cleaned_updated_results.xlsx"

    # Load the data
    sheet_name = "Sheet1"
    df = load_data(input_file_path, sheet_name)

    # Clean the data
    cleaned_df = clean_data(df)

    # Save the cleaned data
    save_data(cleaned_df, output_file_path)
    print(f"Cleaned data saved to {output_file_path}")
