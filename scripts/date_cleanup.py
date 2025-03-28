import pandas as pd
import re

def clean_date_columns(df, date_columns):
    """
    Cleans date columns in a DataFrame by extracting the first valid date and removing extra content.

    Args:
        df (pd.DataFrame): The DataFrame containing date columns to clean.
        date_columns (list): List of column names containing dates.

    Returns:
        pd.DataFrame: The cleaned DataFrame.
    """
    # Define a regular expression to extract the first valid date (DD/MM/YYYY or similar)
    date_pattern = r"\b\d{2}/\d{2}/\d{4}\b"

    # Iterate over each specified date column
    for col in date_columns:
        df[col] = df[col].astype(str).apply(lambda x: re.search(date_pattern, x).group(0) if re.search(date_pattern, x) else None)

    return df

# Example usage
if __name__ == "__main__":
    # Load your Excel file
    file_path = "C:\\Users\\giorg\\Desktop\\database\\final data\\import_ready_protes.xlsx"
    df = pd.read_excel(file_path)

    # Specify the date columns to clean
    date_columns = ['eventdate', 'eventenddate', 'alertstartdate', 'alertenddate']

    # Clean the date columns
    cleaned_df = clean_date_columns(df, date_columns)

    # Save the cleaned DataFrame to a new Excel file
    cleaned_df.to_excel("C:\\Users\\giorg\\Desktop\\database\\final data\\import_ready_protes_v1.xlsx", index=False)
    print("Date columns cleaned and saved to 'cleaned_file.xlsx'")
