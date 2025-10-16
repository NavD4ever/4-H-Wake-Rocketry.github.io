// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Season toggle buttons (shared for rockets and launches pages)
function initSeasonToggles() {
    const seasonControls = document.querySelectorAll('.season-controls');
    if (!seasonControls || seasonControls.length === 0) return;

    seasonControls.forEach(ctrl => {
        const buttons = ctrl.querySelectorAll('.season-btn');
        const container = ctrl.closest('.container');

        // helper to switch visible season-content blocks within the container
        function setSeason(season) {
            if (container) container.setAttribute('data-current-season', season);

            // toggle buttons
            buttons.forEach(b => b.classList.toggle('active', b.getAttribute('data-season') === season));

            // show/hide matching season-content blocks inside this container
            if (container) {
                container.querySelectorAll('.season-content').forEach(block => {
                    const s = block.getAttribute('data-season');
                    if (s === season) {
                        block.style.display = '';
                    } else {
                        block.style.display = 'none';
                    }
                });
            }
        }

        // wire up click handlers
        buttons.forEach(btn => {
            btn.addEventListener('click', () => setSeason(btn.getAttribute('data-season')));
        });

        // initialize: read current-season attribute or fall back to first active button or 2025
        let initial = container ? container.getAttribute('data-current-season') : null;
        if (!initial) {
            const active = ctrl.querySelector('.season-btn.active');
            initial = active ? active.getAttribute('data-season') : (buttons[0] ? buttons[0].getAttribute('data-season') : '2025');
        }
        setSeason(initial);
    });
}

// Launch data
const launchData = {
    2025: {
        "year": 2025,
        "launchDays": [
            {
                "date": "2025-04-13",
                "location": "NC State Fairgrounds",
                "attendedMembers": 8,
                "peakAltitude": 2847,
                "peakTime": "14:32",
                "importantLaunchDay": true,
                "qualificationLaunchDay": false,
                "launches": [
                    {
                        "rocket": "Green Thunder",
                        "motor": "J415-M",
                        "success": true,
                        "altitude": 2847,
                        "eggStatus": "intact",
                        "time": "14:32",
                        "tarcScore": null,
                        "important": true,
                        "publicNotes": "1st Place in High Power Division! Emma Johnson (16) led the team to victory with perfect flight and recovery.",
                        "launchToggle": true,
                        "qualificationLaunchToggle": false
                    }
                ]
            },
            {
                "date": "2025-03-15",
                "location": "Tripoli Rocketry Field",
                "attendedMembers": 6,
                "peakAltitude": 798,
                "peakTime": "10:45",
                "importantLaunchDay": false,
                "qualificationLaunchDay": true,
                "launches": [
                    {
                        "rocket": "TARC Champion",
                        "motor": "F67-9",
                        "success": true,
                        "altitude": 798,
                        "eggStatus": "intact",
                        "time": "44.2s",
                        "tarcScore": 95.8,
                        "important": true,
                        "publicNotes": "TARC National Qualifier - achieved 798 feet in 44.2 seconds with unbroken egg.",
                        "launchToggle": true,
                        "qualificationLaunchToggle": true
                    }
                ]
            }
        ]
    },
    2026: {
        "year": 2026,
        "launchDays": [
            {
                "date": "2026-05-15",
                "location": "NC State Fairgrounds",
                "attendedMembers": 10,
                "peakAltitude": 3200,
                "peakTime": "15:20",
                "importantLaunchDay": true,
                "qualificationLaunchDay": false,
                "launches": [
                    {
                        "rocket": "Thunder Strike II",
                        "motor": "K550-M",
                        "success": true,
                        "altitude": 3200,
                        "eggStatus": "intact",
                        "time": "15:20",
                        "tarcScore": null,
                        "important": true,
                        "publicNotes": "New altitude record! Advanced youth team achieved perfect flight with dual deployment system.",
                        "launchToggle": true,
                        "qualificationLaunchToggle": false
                    }
                ]
            }
        ]
    }
};

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function renderLaunchDay(launchDay) {
    const importantIcon = launchDay.importantLaunchDay ? '🏆' : '🚀';
    const qualIcon = launchDay.qualificationLaunchDay ? ' (QUAL)' : '';
    
    return `
        <div class="launch-day-card" data-date="${launchDay.date}">
            <div class="launch-day-header" onclick="toggleLaunchDay('${launchDay.date}')">
                <h3>${importantIcon} ${formatDate(launchDay.date)}${qualIcon}</h3>
                <div class="launch-day-summary">
                    <span><strong>Location:</strong> ${launchDay.location}</span>
                    <span><strong>Members:</strong> ${launchDay.attendedMembers}</span>
                    <span><strong>Peak Alt:</strong> ${launchDay.peakAltitude} ft</span>
                    <span><strong>Peak Time:</strong> ${launchDay.peakTime}</span>
                </div>
                <div class="expand-icon">▼</div>
            </div>
            <div class="launch-day-details" style="display: none;">
                ${launchDay.launches.map(launch => renderLaunch(launch)).join('')}
            </div>
        </div>
    `;
}

function renderLaunch(launch) {
    const statusIcon = launch.success ? '✅' : '❌';
    const importantBadge = launch.important ? '<span class="important-badge">⭐ Important</span>' : '';
    const qualBadge = launch.qualificationLaunchToggle ? '<span class="qual-badge">🎯 Qualification</span>' : '';
    const tarcScore = launch.tarcScore ? `<strong>TARC Score:</strong> ${launch.tarcScore}<br>` : '';
    
    return `
        <div class="launch-item">
            <div class="launch-header">
                <h4>${statusIcon} ${launch.rocket}</h4>
                <div class="launch-badges">
                    ${importantBadge}
                    ${qualBadge}
                </div>
            </div>
            <div class="launch-details">
                <p><strong>Motor:</strong> ${launch.motor} | <strong>Altitude:</strong> ${launch.altitude} ft</p>
                <p><strong>Egg Status:</strong> ${launch.eggStatus} | <strong>Time:</strong> ${launch.time}</p>
                ${tarcScore ? `<p>${tarcScore}</p>` : ''}
                <p class="launch-notes">${launch.publicNotes}</p>
            </div>
        </div>
    `;
}

function toggleLaunchDay(date) {
    const card = document.querySelector(`[data-date="${date}"]`);
    const details = card.querySelector('.launch-day-details');
    const icon = card.querySelector('.expand-icon');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.textContent = '▲';
        card.classList.add('expanded');
    } else {
        details.style.display = 'none';
        icon.textContent = '▼';
        card.classList.remove('expanded');
    }
}

function renderLaunchDays(year) {
    const data = launchData[year];
    if (!data) return;
    
    const container = document.getElementById(`launch-days-${year}`);
    if (!container) return;
    
    const sortedDays = data.launchDays.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 2rem;">${year} Launch History 🚀</h2>
        <div class="launch-timeline">
            ${sortedDays.map(day => renderLaunchDay(day)).join('')}
        </div>
    `;
}

// Initialize season toggles and load launch data after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initSeasonToggles();
    
    // Load launch data for both years if on launches page
    if (document.getElementById('launch-days-2025')) {
        renderLaunchDays(2025);
        renderLaunchDays(2026);
    }
});

// Gallery image modal (simple lightbox effect)
document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', function() {
        const img = this.querySelector('img');
        if (img) {
            // Create modal overlay
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                cursor: pointer;
            `;
            
            // Create modal image
            const modalImg = document.createElement('img');
            modalImg.src = img.src;
            modalImg.alt = img.alt;
            modalImg.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
            `;
            
            modal.appendChild(modalImg);
            document.body.appendChild(modal);
            
            // Close modal on click
            modal.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        }
    });
});

// Contact form handling
function handleSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(event.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const subject = formData.get('subject');
    const message = formData.get('message');
    
    // Simple validation
    if (!name || !email || !message) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Simulate form submission
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    // Simulate API call delay
    setTimeout(() => {
        alert(`Thank you, ${name}! Your message has been sent. We'll get back to you soon!`);
        event.target.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 1500);
}

// Animate elements on scroll (simple intersection observer)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('.highlight-card, .team-member, .rocket-card, .launch-item');
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add loading animation for images (excluding gallery and rocket photos)
document.querySelectorAll('img:not(.gallery-item img):not(.rocket-photo)').forEach(img => {
    img.addEventListener('load', function() {
        this.style.opacity = '1';
    });
    
    // Set initial opacity for smooth loading
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
});

// Rocket launch animation for logo (fun easter egg)
document.querySelector('.nav-logo').addEventListener('click', function() {
    this.style.transform = 'translateY(-10px) rotate(5deg)';
    this.style.transition = 'transform 0.3s ease';
    
    setTimeout(() => {
        this.style.transform = 'translateY(0) rotate(0deg)';
    }, 300);
});