// --- INVENTORY MOVEMENT SETTINGS MODULE LOGIC ---
window.InvMovementPrefs = {
    init: async function() {
        console.log("Inv Movement Preferences: Initializing...");
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        
        try {
            const cb = `_cb=${Date.now()}`;
            const [inRes, outRes] = await Promise.all([
                fetch(`api/settings.php?action=get_setting&key=inv_move_in&company_id=${companyId}&${cb}`),
                fetch(`api/settings.php?action=get_setting&key=inv_move_out&company_id=${companyId}&${cb}`)
            ]);
            
            const inData = await inRes.json();
            const outData = await outRes.json();

            if (inData.value) {
                const radio = document.querySelector(`input[name="inwardsMovement"][value="${inData.value}"]`);
                if (radio) radio.checked = true;
            }
            if (outData.value) {
                const radio = document.querySelector(`input[name="outwardsMovement"][value="${outData.value}"]`);
                if (radio) radio.checked = true;
            }
        } catch (e) { console.error("Load Movement Settings Error:", e); }
    },

    save: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        
        const inVal = document.querySelector('input[name="inwardsMovement"]:checked')?.value;
        const outVal = document.querySelector('input[name="outwardsMovement"]:checked')?.value;

        try {
            await Promise.all([
                fetch(`api/settings.php?action=save_setting&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'inv_move_in', value: inVal })
                }),
                fetch(`api/settings.php?action=save_setting&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'inv_move_out', value: outVal })
                })
            ]);
            alert("Movement preferences saved successfully!");
            closeModularPopup();
        } catch (e) { console.error("Save Movement Settings Error:", e); }
    }
};
