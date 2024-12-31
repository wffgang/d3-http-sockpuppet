async function update(address) {
    const changedElement = document.querySelector(`[name="${address}"]`);
    const newValue = changedElement.value;
    console.log('Sending update for address:', address, 'value:', newValue);
    
    try {
        const response = await fetch(`http://127.0.0.1/api/session/sockpuppet/update/${address}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: newValue })
        });
        const result = await response.json();
        console.log('Update result:', result);
    } catch (error) {
        console.error('Error updating value:', error);
    }
}

function onValueChange(event) {
    const changedElement = event.target;
    const address = changedElement.getAttribute('name');
    if (address) {
        console.log('onValueChange')
        update(address);
    }
}

function bindChangeEvents() {
    const inputs = document.querySelectorAll('select, input');
    inputs.forEach(input => {
        input.addEventListener('change', onValueChange);
    });
}

// Call when page loads
window.addEventListener('load', bindChangeEvents); 