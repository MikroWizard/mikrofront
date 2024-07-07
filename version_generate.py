import json
import os
#load package.json and extract version infromation and write it to a file
with open('./package.json') as f:
    data = json.load(f)
    data ={
        'version': data['version'],
        'name':data['name']
    }
    with open('./dist/mikrowizard/version.json', 'w') as f:
        json.dump(data, f)
        print('Version information written to version.json')
        
