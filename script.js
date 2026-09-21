document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Logic
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeToggleText = document.getElementById('themeToggleText');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('workshift_theme', theme);
    if (themeToggleText) {
      themeToggleText.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
  }

  const savedTheme = localStorage.getItem('workshift_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  // App Elements
  const currentLoggedHoursEl = document.getElementById('currentLoggedHours');
  const currentLoggedMinsEl = document.getElementById('currentLoggedMins');
  const currentTimeInputEl = document.getElementById('currentTimeInput');
  const useRealTimeBtn = document.getElementById('useRealTimeBtn');
  const checkoutTimeInputEl = document.getElementById('checkoutTimeInput');
  const requiredHoursInputEl = document.getElementById('requiredHoursInput');

  const statusBadgeEl = document.getElementById('statusBadge');
  const statusBadgeTextEl = document.getElementById('statusBadgeText');
  const remainingBreakValEl = document.getElementById('remainingBreakVal');
  const remainingBreakLabelEl = document.getElementById('remainingBreakLabel');
  const progressBarFillEl = document.getElementById('progressBarFill');
  const progressPercentEl = document.getElementById('progressPercent');

  const workRemainingValEl = document.getElementById('workRemainingVal');
  const timeLeftCheckoutValEl = document.getElementById('timeLeftCheckoutVal');
  const completionTimeValEl = document.getElementById('completionTimeVal');
  const recommendationBannerEl = document.getElementById('recommendationBanner');

  const checkoutPresetsEl = document.getElementById('checkoutPresets');
  const hoursPresetsEl = document.getElementById('hoursPresets');

  let isManualTimeOverride = false;

  // Initialize Clock Input to actual system time
  function setClockToNow() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    currentTimeInputEl.value = `${hrs}:${mins}`;
    isManualTimeOverride = false;
    calculate();
  }

  // Format Helper: Minutes to "X hrs Y mins" or "Y mins"
  function formatMins(totalMins) {
    const isNegative = totalMins < 0;
    const absMins = Math.abs(totalMins);
    const h = Math.floor(absMins / 60);
    const m = absMins % 60;

    let res = '';
    if (h > 0) res += `${h} hr${h > 1 ? 's' : ''} `;
    if (m > 0 || h === 0) res += `${m} min${m !== 1 ? 's' : ''}`;
    
    return isNegative ? `-${res.trim()}` : res.trim();
  }

  // Format Helper: Minutes from Midnight to 12-hour AM/PM Time String
  function formatMinutesToTime(minsFromMidnight) {
    let normalized = minsFromMidnight % (24 * 60);
    if (normalized < 0) normalized += 24 * 60;

    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = String(minutes).padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${period}`;
  }

  // Parse HH:MM time string to minutes from midnight
  function timeStringToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  // Active Chip Highlighter
  function updatePresetChips(container, activeVal) {
    if (!container) return;
    const chips = container.querySelectorAll('.chip');
    chips.forEach(chip => {
      if (chip.dataset.value === String(activeVal)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  // Core Calculation Function
  function calculate() {
    const loggedHours = parseInt(currentLoggedHoursEl.value) || 0;
    const loggedMins = parseInt(currentLoggedMinsEl.value) || 0;
    const totalLoggedMins = loggedHours * 60 + loggedMins;

    const requiredHours = parseFloat(requiredHoursInputEl.value) || 8;
    const totalRequiredMins = Math.round(requiredHours * 60);

    const currentTimeMins = timeStringToMinutes(currentTimeInputEl.value);
    const checkoutTimeMins = timeStringToMinutes(checkoutTimeInputEl.value);

    // Sync chip highlights
    updatePresetChips(checkoutPresetsEl, checkoutTimeInputEl.value);
    updatePresetChips(hoursPresetsEl, requiredHoursInputEl.value);

    // 1. Work remaining
    const workRemainingMins = Math.max(0, totalRequiredMins - totalLoggedMins);
    workRemainingValEl.textContent = formatMins(workRemainingMins);

    // 2. Time left till checkout
    const timeLeftTillCheckoutMins = checkoutTimeMins - currentTimeMins;
    if (timeLeftTillCheckoutMins >= 0) {
      timeLeftCheckoutValEl.textContent = formatMins(timeLeftTillCheckoutMins);
    } else {
      timeLeftCheckoutValEl.textContent = `${formatMins(Math.abs(timeLeftTillCheckoutMins))} past checkout`;
    }

    // 3. Earliest Completion Time
    const earliestCompletionMins = currentTimeMins + workRemainingMins;
    completionTimeValEl.textContent = formatMinutesToTime(earliestCompletionMins);

    // 4. Remaining Break available before checkout time
    const remainingBreakMins = timeLeftTillCheckoutMins - workRemainingMins;

    // 5. Progress Percentage
    const progressPct = Math.min(100, Math.round((totalLoggedMins / totalRequiredMins) * 100));
    progressBarFillEl.style.width = `${progressPct}%`;
    progressPercentEl.textContent = `${progressPct}%`;

    // 6. Status & Recommendation Banner Messaging
    const formattedCheckoutTime = formatMinutesToTime(checkoutTimeMins);

    if (totalLoggedMins >= totalRequiredMins) {
      // Completed Goal
      statusBadgeEl.className = 'result-status-pill pill-green';
      statusBadgeTextEl.textContent = 'Goal Completed';
      remainingBreakValEl.textContent = '0 mins';
      remainingBreakLabelEl.textContent = 'Required login target achieved!';
      recommendationBannerEl.style.borderColor = 'var(--accent-green)';
      recommendationBannerEl.style.background = 'var(--accent-green-bg)';
      recommendationBannerEl.innerHTML = `<strong>Goal Achieved:</strong> Aapka <b>${requiredHours} hours</b> login target complete ho chuka hai. Aap ab checkout kar sakte hain!`;
    } else if (remainingBreakMins > 0) {
      // Positive break remaining
      statusBadgeEl.className = 'result-status-pill pill-green';
      statusBadgeTextEl.textContent = 'Break Available';
      remainingBreakValEl.textContent = formatMins(remainingBreakMins);
      remainingBreakLabelEl.textContent = `Break buffer remaining before ${formattedCheckoutTime}`;
      recommendationBannerEl.style.borderColor = 'var(--accent-green)';
      recommendationBannerEl.style.background = 'var(--accent-green-bg)';
      recommendationBannerEl.innerHTML = `<strong>Buffer Available:</strong> Aap abhi <b>${formatMins(remainingBreakMins)}</b> ka break le sakte hain. Iske baad bhi aapka target <b>${formattedCheckoutTime}</b> tak exact complete ho jayega.`;
    } else if (remainingBreakMins === 0) {
      // Exactly on track
      statusBadgeEl.className = 'result-status-pill pill-amber';
      statusBadgeTextEl.textContent = 'On Exact Track';
      remainingBreakValEl.textContent = '0 mins';
      remainingBreakLabelEl.textContent = `Zero break margin for ${formattedCheckoutTime} checkout`;
      recommendationBannerEl.style.borderColor = 'var(--accent-amber)';
      recommendationBannerEl.style.background = 'var(--accent-amber-bg)';
      recommendationBannerEl.innerHTML = `<strong>On Exact Track:</strong> <b>${formattedCheckoutTime}</b> checkout ke liye abhi se continuously logged in rehna padega (no more breaks).`;
    } else {
      // Negative break remaining (shortage)
      const shortageMins = Math.abs(remainingBreakMins);
      statusBadgeEl.className = 'result-status-pill pill-red';
      statusBadgeTextEl.textContent = 'Shortage Warning';
      remainingBreakValEl.textContent = `-${formatMins(shortageMins)}`;
      remainingBreakLabelEl.textContent = `Time short for ${formattedCheckoutTime} checkout`;
      recommendationBannerEl.style.borderColor = 'var(--accent-red)';
      recommendationBannerEl.style.background = 'var(--accent-red-bg)';
      recommendationBannerEl.innerHTML = `<strong>Time Shortage:</strong> <b>${formattedCheckoutTime}</b> tak target complete nahi hoga (${formatMins(shortageMins)} short). Target poora karne ke liye aapko <b>${formatMinutesToTime(earliestCompletionMins)}</b> tak work karna hoga.`;
    }
  }

  // Event Listeners for Preset Chips
  if (checkoutPresetsEl) {
    checkoutPresetsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      checkoutTimeInputEl.value = chip.dataset.value;
      calculate();
    });
  }

  if (hoursPresetsEl) {
    hoursPresetsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      requiredHoursInputEl.value = chip.dataset.value;
      calculate();
    });
  }

  // Input Event Listeners
  currentLoggedHoursEl.addEventListener('input', calculate);
  currentLoggedMinsEl.addEventListener('input', calculate);
  checkoutTimeInputEl.addEventListener('input', calculate);
  requiredHoursInputEl.addEventListener('input', calculate);

  currentTimeInputEl.addEventListener('input', () => {
    isManualTimeOverride = true;
    calculate();
  });

  useRealTimeBtn.addEventListener('click', () => {
    setClockToNow();
  });

  // Auto update real-time clock every minute if not manually overridden
  setInterval(() => {
    if (!isManualTimeOverride) {
      setClockToNow();
    }
  }, 60000);

  // Initial call
  setClockToNow();
});
