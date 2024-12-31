import requests
import json
import os

object_list = []

def create_and_open_html_report(object_list):
        # Create a simple HTML page to display the patches
        html_content = """
        <html>
        <head>
            <title>Patch Results</title>
            <style>
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
            </style>
        </head>
        <body>
            <h1>Patch Results</h1>
            <table>
                <tr>
                    <th>Address</th>
                    <th>Field Name</th>
                    <th>Field Type</th>
                    <th>Value</th>
                </tr>
        """

        # Add each patch as a table row
        for patch in object_list:
            # Create different input fields based on type
            if patch['field_type'] == 'string':
                options_html = ''.join(f'<option value="{option}">{option}</option>' for option in patch['options'])
                value_cell = f"""
                    <td>
                        <select name="{patch['address']}">
                            <option value="{patch['value']}" selected>{patch['value']}</option>
                            {options_html}
                        </select>
                    </td>"""
            elif patch['field_type'] == 'float':
                value_cell = f"""
                    <td>
                        <input type="range" 
                               name="{patch['address']}"
                               min="{patch['min']}" 
                               max="{patch['max']}"
                               value="{patch['value']}"
                               step="{patch['step']}"
                               oninput="this.nextElementSibling.textContent=this.value">
                        <span>{patch['value']}</span>
                    </td>"""
            elif patch['field_type'] == 'resource':
                value_cell = f"""
                    <td>
                        <input type="text" 
                               name="{patch['address']}"
                               value="{patch['value']}">
                    </td>"""
            else:
                value_cell = f"<td>{patch['value']}</td>"
                
            html_content += f"""
                <tr>
                    <td>{patch['address']}</td>
                    <td>{patch['field_name']}</td>
                    <td>{patch['field_type']}</td>
                    {value_cell}
                </tr>
            """

        html_content += """
            </table>
            <script src="patch_handler.js"></script>
        </body>
        </html>
        """

        #load the js scrpts here!!!!

        # Get the directory of the current script
        script_dir = os.path.dirname(os.path.abspath(__file__))

        # Define the file path
        file_path = os.path.join(script_dir, 'patch_results.html')

        # Write the HTML content to the file
        with open(file_path, 'w') as f:
            f.write(html_content)

        # Try to open the HTML file in the default browser
        import webbrowser
        try:
            webbrowser.open(file_path)
            print("Results opened in web browser")
            return True
        except Exception as e:
            print(f"Could not open browser: {e}")
            print("Results saved to patch_results.html")
            return False
        
        return False

def get_patches():
    # API endpoint URL
    url = "http://127.0.0.1/api/session/sockpuppet/patches"

    # Request headers
    headers = {
        'accept': 'application/json'
    }

    try:
        response = requests.get(url, headers=headers)     
        # Check if request was successful
        response.raise_for_status()  
        # Parse JSON response
        data = response.json()

        # Check status code in response
        status = data.get('status', {})
        status_code = status.get('code')
        
        if status_code != 0:
            status_message = status.get('message', 'Unknown error')
            status_details = status.get('details', [])
            raise Exception(f"API returned error status {status_code}: {status_message}. Details: {status_details}")
        
        result_list = data.get('result', [])
        for result in result_list:
            address = result.get('address')
            fields = result.get('fields', [])
            
            for field in fields:
                field_name = field.get('name')
                field_type = field.get('type')
                
                # Initialize common fields
                patch_obj = {
                    'address': address,
                    'field_name': field_name,
                    'field_type': field_type
                }

                match field_type:
                    case 'string':
                        string_meta = field.get('stringMeta', {})
                        patch_obj.update({
                            'value': field.get('stringValue'),
                            'options': string_meta.get('options')
                        })
                    
                    case 'float':
                        float_value = field.get('floatValue', {})
                        float_meta = field.get('floatMeta', {})
                        patch_obj.update({
                            'value': float_value.get('value'),
                            'min': float_meta.get('min'),
                            'max': float_meta.get('max'),
                            'step': float_meta.get('step')
                        })
                    
                    case 'resource':
                        resource_value = field.get('resourceValue', {})
                        patch_obj.update({
                            'value': resource_value.get('uid')
                        })
                        
                    case _:
                        patch_obj['value'] = None
                object_list.append(patch_obj)
        
        # Print or process the results
        print(f"Successfully parsed {len(object_list)} patches")
        if len(object_list) > 0:
            return True
        else:
            print("No patches found in the response")

    except requests.exceptions.RequestException as e:
        print(f"Error making API request: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def update():
    print('update')


if __name__ == "__main__":
    if get_patches():
        if create_and_open_html_report(object_list):
            if True:
                update()
    else:
        print("Failed to get patches")
