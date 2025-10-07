import csv
import json

# Read CSV file and convert to list of dictionaries
with open('mydata.csv', 'r', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    data = list(reader)

# Write data to JSON file
with open('mydata.json', 'w', encoding='utf-8') as jsonfile:
    json.dump(data, jsonfile, indent=2)

print("CSV converted to JSON successfully!")
