import csv
import json

def parse_value(value):
    try:
        # Try int conversion first
        return int(value)
    except ValueError:
        try:
            # If int fails, try float
            return float(value)
        except ValueError:
            # Otherwise, keep as string
            return value

with open('mydata.csv', newline='', encoding='utf-8') as csvfile:
    reader = csv.reader(csvfile)
    data = []
    for row in reader:
        parsed_row = [parse_value(cell) for cell in row]
        data.append(parsed_row)

with open('mydata.json', 'w', encoding='utf-8') as jsonfile:
    json.dump(data, jsonfile, indent=2)
