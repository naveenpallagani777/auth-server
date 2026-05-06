document.addEventListener('DOMContentLoaded', () => {
    // ---- Phone Validation Logic ----
    const unifiedInput = document.getElementById('unified-input');
    const phoneInput = document.querySelector('input[name="phoneNumber"]') || unifiedInput;
    const hiddenCode = document.getElementById('phoneCode');
    const unifiedLabel = document.getElementById('unified-label');
    const phoneCodeWrap = document.getElementById('phoneCodeWrap');
    const hint = document.getElementById('phone-hint');
    const form = document.querySelector('form');

    const lengths = { '+91':10, '+1':10, '+44':10, '+61':9, '+81':10, '+49':11, '+33':9, '+971':9, '+65':8, '+86':11 };

    // Custom dropdown logic
    document.querySelectorAll('.phone-dropdown').forEach(dd => {
        const btn = dd.querySelector('.phone-dropdown-btn');
        const list = dd.querySelector('.phone-dropdown-list');
        const hidden = dd.querySelector('input[type="hidden"]');
        const label = dd.querySelector('[id$="-label"]');
        if (!btn || !list) return;
        btn.addEventListener('click', () => list.classList.toggle('open'));
        btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); list.classList.toggle('open'); }});
        list.querySelectorAll('.phone-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const code = item.dataset.code;
                const cc = item.dataset.country;
                hidden.value = code;
                label.textContent = code;
                btn.querySelector('img').src = 'https://flagcdn.com/w40/' + cc.toLowerCase() + '.png';
                list.querySelectorAll('.phone-dropdown-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                list.classList.remove('open');
                const activeInput = unifiedInput || phoneInput;
                if (activeInput && (activeInput.name === 'phoneNumber' || !unifiedInput)) applyPhoneValidation(activeInput);
                if (activeInput) activeInput.focus();
            });
        });
        document.addEventListener('click', (e) => { if (!dd.contains(e.target)) list.classList.remove('open'); });
    });

    const getSelectedCode = () => hiddenCode ? hiddenCode.value : '';

    const applyPhoneValidation = (inputEl) => {
        inputEl.value = inputEl.value.replace(/[^0-9]/g, '');
        const expected = lengths[getSelectedCode()];
        if (expected) {
            inputEl.maxLength = expected;
            if (inputEl.value.length > expected) inputEl.value = inputEl.value.slice(0, expected);
        } else { inputEl.removeAttribute('maxLength'); }
        if (hint) { hint.textContent = ''; hint.className = 'phone-hint'; }
    };

    if (form) {
        form.addEventListener('submit', (e) => {
            const activeInput = unifiedInput || phoneInput;
            if (!activeInput) return;
            if (unifiedInput && unifiedInput.name !== 'phoneNumber') return;
            const expected = lengths[getSelectedCode()];
            const digits = activeInput.value.replace(/[^0-9]/g, '').length;
            if (expected && digits !== expected) {
                e.preventDefault();
                if (hint) { hint.textContent = 'Phone number must be ' + expected + ' digits'; hint.className = 'phone-hint error'; }
            }
        });
    }

    if (unifiedInput && unifiedLabel) {
        unifiedInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (/^[0-9]/.test(val)) {
                if (phoneCodeWrap) phoneCodeWrap.style.display = 'block';
                unifiedInput.style.width = '65%';
                unifiedInput.name = 'phoneNumber';
                unifiedInput.type = 'tel';
                unifiedInput.inputMode = 'numeric';
                unifiedLabel.innerText = 'Phone Number';
                unifiedInput.placeholder = '9876543210';
                applyPhoneValidation(unifiedInput);
            } else {
                if (phoneCodeWrap) phoneCodeWrap.style.display = 'none';
                unifiedInput.style.width = '100%';
                unifiedInput.name = 'email';
                unifiedInput.type = val.length > 0 ? 'email' : 'text';
                unifiedInput.removeAttribute('inputMode');
                unifiedLabel.innerText = val.length > 0 ? 'Email' : 'Email or Phone Number';
                unifiedInput.placeholder = 'you@example.com or 9876543210';
                unifiedInput.removeAttribute('maxLength');
                if (hint) { hint.textContent = ''; hint.className = 'phone-hint'; }
            }
        });
    } else if (phoneInput) {
        phoneInput.addEventListener('input', () => applyPhoneValidation(phoneInput));
    }

    // ---- Auth Toggle Logic ----
    const togglePassword = document.getElementById('toggle-password');
    const toggleOtp = document.getElementById('toggle-otp');
    const loginMethod = document.getElementById('loginMethod');
    const passwordSection = document.getElementById('password-section');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.querySelector('button[type="submit"]');

    if (togglePassword && toggleOtp && loginMethod) {
        togglePassword.addEventListener('click', () => {
            togglePassword.classList.add('active');
            toggleOtp.classList.remove('active');
            loginMethod.value = 'PASSWORD';
            if (passwordSection) passwordSection.style.display = 'block';
            if (passwordInput) passwordInput.required = true;
            if (submitBtn) submitBtn.textContent = 'Sign in';
        });

        toggleOtp.addEventListener('click', () => {
            toggleOtp.classList.add('active');
            togglePassword.classList.remove('active');
            loginMethod.value = 'OTP';
            if (passwordSection) passwordSection.style.display = 'none';
            if (passwordInput) {
                passwordInput.required = false;
                passwordInput.value = ''; // clear password
            }
            if (submitBtn) submitBtn.textContent = 'Send OTP';
        });
    }
});
