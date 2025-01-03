async function getPatches() {
    try {
        const response = await fetch('http://127.0.0.1/api/session/sockpuppet/patches', {
            headers: {
                'accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status?.code !== 0) {
            throw new Error(`API returned error status ${data.status.code}: ${data.status.message}`);
        }

        const objectList = [];
        
        data.result.forEach(result => {
            const { address, uid, fields } = result;
            
            fields.forEach(field => {
                const patchObj = {
                    address,
                    uid,
                    field_name: field.name,
                    field_type: field.type,
                    display_name: field.displayName
                };

                switch (field.type) {
                    case 'string':
                        patchObj.value = field.stringValue;
                        patchObj.options = field.stringMeta?.options;
                        break;
                    
                    case 'float':
                        patchObj.value = field.floatValue?.value;
                        patchObj.min = field.floatMeta?.min;
                        patchObj.max = field.floatMeta?.max;
                        patchObj.step = field.floatMeta?.step;
                        break;
                    
                    case 'resource':
                        patchObj.value = field.resourceValue?.uid;
                        break;
                    
                    default:
                        patchObj.value = null;
                }
                
                objectList.push(patchObj);
            });
        });

        updateTable(objectList);
        console.log(`Successfully parsed ${objectList.length} patches`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateTable(patches) {
    const table = document.getElementById('patchTable');
    
    patches.forEach(patch => {
        const row = table.insertRow();
        
        row.insertCell().textContent = patch.address;
        row.insertCell().textContent = patch.display_name;
        row.insertCell().textContent = patch.field_type;
        
        const valueCell = row.insertCell();
        switch (patch.field_type) {
            case 'string':
                const select = document.createElement('select');
                select.name = patch.display_name;
                select.setAttribute('field_name', patch.field_name);
                select.setAttribute('address', patch.address);
                select.setAttribute('uid', patch.uid);
                
                const defaultOption = document.createElement('option');
                defaultOption.value = patch.value;
                defaultOption.textContent = patch.value;
                defaultOption.selected = true;
                select.appendChild(defaultOption);
                
                patch.options?.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    select.appendChild(optionElement);
                });
                
                valueCell.appendChild(select);
                break;
                
            case 'float':
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.gap = '10px';
                
                const range = document.createElement('input');
                range.type = 'range';
                range.name = patch.display_name;
                range.setAttribute('field_name', patch.field_name);
                range.setAttribute('address', patch.address);
                range.setAttribute('uid', patch.uid);
                range.min = patch.min;
                range.max = patch.max;
                range.value = patch.value;
                range.step = patch.step;
                
                const numberInput = document.createElement('input');
                numberInput.type = 'number';
                numberInput.value = patch.value;
                numberInput.min = patch.min;
                numberInput.max = patch.max;
                numberInput.step = patch.step;
                numberInput.style.width = '80px';
                
                // Sync the values between range and number input
                range.oninput = () => {
                    numberInput.value = range.value;
                };
                
                numberInput.oninput = () => {
                    range.value = numberInput.value;
                };
                
                // Copy the necessary attributes to number input for the change event handler
                numberInput.setAttribute('field_name', patch.field_name);
                numberInput.setAttribute('address', patch.address);
                numberInput.setAttribute('uid', patch.uid);
                
                container.appendChild(range);
                container.appendChild(numberInput);
                valueCell.appendChild(container);
                break;
                
            case 'resource':
                const input = document.createElement('input');
                input.type = 'text';
                input.name = patch.display_name;
                input.setAttribute('field_name', patch.field_name);
                input.setAttribute('address', patch.address);
                input.setAttribute('uid', patch.uid);
                input.value = patch.value;
                
                valueCell.appendChild(input);
                break;
                
            default:
                valueCell.textContent = patch.value;
        }
    });
}

function setupLiveUpdates() {
    const table = document.getElementById('patchTable');
    
    table.addEventListener('change', async (event) => {
        const target = event.target;
        if (target.tagName === 'SELECT' || target.tagName === 'INPUT') {
            const fieldName = target.getAttribute('field_name');
            const address = target.getAttribute('address');
            const uid = target.getAttribute('uid');
            const value = target.value;
            const type = target.type;
            
            const changes = [{
                field: fieldName
            }];

            // Build the changes object based on input type
            if (target.tagName === 'SELECT') {
                changes[0].stringValue = value;
            } else if ((type === 'range') || (type === 'number')) {
                changes[0].floatValue = {
                    value: parseFloat(value),
                    duration: 0,
                    easingFunction: "Linear",
                    startValue: parseFloat(value),
                    currentValue: parseFloat(value)
                };
            } else if (type === 'text') {
                changes[0].resourceValue = {
                    uid: value,
                    name: value
                };
            }
            
            try {
                const response = await fetch('http://127.0.0.1/api/session/sockpuppet/live', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        patches: [{
                            address: address,
                            changes: changes,
                            uid: uid
                        }]
                    })
                });

                const data = await response.json();
                if (data.status?.code !== 0) {
                    throw new Error(`API returned error status ${data.status.code}: ${data.status.message}`);
                }
                console.log(`Successfully updated ${fieldName} to ${value}`);
            } catch (error) {
                console.error('Error updating value:', error);
            }
        }
    });
}

function clearTable() {
    const table = document.getElementById('patchTable');
    // Keep the header row by removing all but the first row
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
}

function setupRefreshButton() {
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Patches';
    refreshButton.addEventListener('click', async () => {
        clearTable();
        await getPatches();
    });
    
    // Insert the button before the table
    const table = document.getElementById('patchTable');
    table.parentNode.insertBefore(refreshButton, table);
}

// Initial load
getPatches();
setupLiveUpdates();
setupRefreshButton(); 