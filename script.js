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

            // render planned launches for this season if applicable
            try {
                const yearNum = parseInt(season, 10);
                if (!isNaN(yearNum)) renderPlannedLaunches(yearNum);
            } catch (e) {
                // ignore
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

// Private mode state
let isPrivateMode = false;

function togglePrivateMode() {
    if (!isPrivateMode) {
        const code = prompt('Enter master code:');
        if (code === '04739') {
            isPrivateMode = true;
            document.getElementById('lock-btn').textContent = '🔓';
            refreshCurrentView();
        } else {
            alert('Incorrect code');
        }
    } else {
        isPrivateMode = false;
        document.getElementById('lock-btn').textContent = '🔒';
        refreshCurrentView();
    }
}

function refreshCurrentView() {
    if (document.getElementById('launch-days-2025')) {
        renderLaunchDays(2025);
        renderLaunchDays(2026);
    }
    if (document.getElementById('rocket-grid')) {
        renderRockets();
    }
}

// Planned launches rendering: prefer CSV at data/planned-launches-<year>.csv, fall back to JSON at data/planned-launches-<year>.json
function renderPlannedLaunches(year) {
    const container = document.getElementById(`planned-launches-${year}`);
    if (!container) return;

    const csvUrl = `data/planned-launches-${year}.csv`;
    const jsonUrl = `data/planned-launches-${year}.json`;

    // Try CSV first
    fetch(csvUrl).then(resp => {
        if (!resp.ok) throw new Error('CSV not found');
        return resp.text();
    }).then(text => {
        const parsed = parseCsvToObjects(text).slice(0,3);
        renderPlannedIntoContainer(container, year, parsed);
    }).catch(() => {
        // Fallback to JSON file
        fetch(jsonUrl).then(r => {
            if (!r.ok) throw new Error('JSON not found');
            return r.json();
        }).then(j => {
            const arr = (j.plannedLaunches || []).slice(0,3);
            renderPlannedIntoContainer(container, year, arr);
        }).catch(() => {
            // No data available
            container.innerHTML = '';
        });
    });
}

function renderPlannedIntoContainer(container, year, planned) {
    if (!planned || planned.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Normalize fields for CSV which may have different header names
    const normalized = planned.map(p => normalizePlannedRow(p));

    container.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 1rem;">Planned Launches (${year})</h2>
        <div class="planned-grid">
            ${normalized.map(p => renderPlannedCard(p)).join('')}
        </div>
    `;
}

function normalizePlannedRow(p) {
    // Accept various keys that might be present in CSV/JSON and map to expected fields
    return {
        date: p.date || p.Date || p.launch_date || '',
        time: p.time || p.Time || '',
        location: p.location || p.Location || p.site || '',
        event: p.event || p.event_name || p.Event || p.title || '',
        rocket: p.rocket || p.Rocket || p.rocket_name || '',
        motor: p.motor || p.Motor || '',
        notes: p.notes || p.Notes || p.description || '',
        image: p.image || p.Image || ''
    };
}

function renderPlannedCard(p) {
    const date = p.date ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const imgHtml = p.image ? `<img src="launch day photos/${p.image}" alt="${p.event || ''}" class="planned-photo">` : '';
    return `
        <div class="planned-card">
            <div class="planned-card-body">
                <div class="planned-meta">
                    <h4>${escapeHtml(p.event || '')}</h4>
                    <div class="planned-meta-small">${escapeHtml(date)} ${p.time ? '· ' + escapeHtml(p.time) : ''} ${p.location ? '· ' + escapeHtml(p.location) : ''}</div>
                </div>
                <p class="planned-notes">${escapeHtml(p.notes || '')}</p>
                <div class="planned-rocket"><strong>Rocket:</strong> ${escapeHtml(p.rocket || '')} ${p.motor ? '· <strong>Motor:</strong> ' + escapeHtml(p.motor) : ''}</div>
            </div>
            <div class="planned-card-img">${imgHtml}</div>
        </div>
    `;
}

// Basic HTML escape for text inserted into templates
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Very small CSV parser: converts header row + rows into array of objects.
function parseCsvToObjects(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]).map(h => h.trim());
    const rows = lines.slice(1);
    return rows.map(r => {
        const cols = splitCsvLine(r);
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = cols[i] !== undefined ? cols[i].trim() : '';
        });
        return obj;
    });
}

// Splits a single CSV line handling simple quotes. Not a full RFC parser, but works for our data.
function splitCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i+1] === '"') { // escaped quote
                cur += '"';
                i++; 
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    result.push(cur);
    return result;
}

// Rocket data
const rocketData = {
    "rockets": [
        {
            "name": "Green Thunder",
            "creationDate": "2024-08-15",
            "image": "green-thunder.jpg",
            "altitudeIntent": 2800,
            "diameter": 3.9
        },
        {
            "name": "TARC Champion",
            "creationDate": "2024-02-20",
            "image": "tarc-champion.jpg",
            "altitudeIntent": 800,
            "diameter": 2.6
        },
        {
            "name": "Youth Builder Special",
            "creationDate": "2024-01-10",
            "image": "youth-builder.jpg",
            "altitudeIntent": 650,
            "diameter": 1.6
        },
        {
            "name": "Thunder Strike II",
            "creationDate": "2025-03-01",
            "image": "thunder-strike-ii.jpg",
            "altitudeIntent": 3200,
            "diameter": 4.0
        }
    ]
};

function getRocketInfo(rocketName) {
    return rocketData.rockets.find(rocket => rocket.name === rocketName);
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
                "photo": "state-championship-2025.jpg",
                "weather": {
                    "cloudy": true,
                    "muddy": false,
                    "rainy": false,
                    "visibility": "Good"
                },
                "feedback": {
                    "recoveryFeedback": "Excellent recovery system performance",
                    "launchSequenceFeedback": "Smooth countdown and ignition",
                    "preparednessFeedback": "Team was well prepared",
                    "rocketRecoveryFeedback": "Quick and efficient recovery",
                    "rocketSetupFeedback": "Setup went smoothly",
                    "whatToImprove": "Better wind monitoring"
                },
                "roles": {
                    "Naveen": "Launch Director",
                    "Shri": "Safety Officer",
                    "Zach": "Recovery Team",
                    "Hrishiv": "Data Logger",
                    "Matthew": "Rocket Prep",
                    "Shu": "Range Safety"
                },
                "timePeriod": "9:00 AM - 3:00 PM",
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
                        "qualificationLaunchToggle": false,
                        "rocketData": {
                            "parachuteSize": 24,
                            "payloadMass": 2.1,
                            "totalMass": 1850,
                            "ballastMass": 150,
                            "altimeter": "PerfectFlite StratoLoggerCF"
                        },
                        "weatherAtLaunch": {
                            "timeOfLaunch": "14:32",
                            "temperature": 72,
                            "humidity": 45,
                            "windDirection": "NW",
                            "windSpeed": 8,
                            "airPressure": 30.15,
                            "launchNumber": 1
                        },
                        "predictedAltitude": 2750,
                        "predictedTime": 45,
                        "launch": {
                            "successfulLiftoff": true,
                            "hungOnRod": false,
                            "tipOff": false,
                            "motorFail": false
                        },
                        "trajectory": {
                            "straight": true,
                            "spin": false,
                            "corkscrewBarrelRoll": false,
                            "unstable": false,
                            "weathercocked": false
                        },
                        "recovery": {
                            "ejectionTime": 42,
                            "delay": 6,
                            "landing": "Soft",
                            "recovered": true,
                            "crash": false,
                            "ballistic": false
                        },
                        "parachuteRecovery": {
                            "deploymentLevel": "Apogee",
                            "parachuteDescent": "Stable",
                            "tangled": false
                        },
                        "damage": {
                            "scuffedPaint": false,
                            "minorDamage": false,
                            "rocketDestroyed": false,
                            "rocketLoss": false,
                            "finsDamaged": false,
                            "zipperedTube": false
                        },
                        "privateNotes": "Perfect flight conditions, motor performed exactly as expected"
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
                "photo": "tarc-qualifier-2025.jpg",
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
            },
            {
                "date": "2025-02-08",
                "location": "Wake County Launch Field",
                "attendedMembers": 5,
                "peakAltitude": 650,
                "peakTime": "11:15",
                "importantLaunchDay": false,
                "qualificationLaunchDay": false,
                "photo": null,
                "launches": [
                    {
                        "rocket": "Youth Builder Special",
                        "motor": "D12-5",
                        "success": true,
                        "altitude": 650,
                        "eggStatus": "n/a",
                        "time": "11:15",
                        "tarcScore": null,
                        "important": false,
                        "publicNotes": "Perfect training flight! Five new 4-H members successfully built and launched their first rockets.",
                        "launchToggle": true,
                        "qualificationLaunchToggle": false
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
                "photo": "record-altitude-2026.jpg",
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
    const photoHtml = launchDay.photo ? `<img src="launch day photos/${launchDay.photo}" alt="Launch day photo" class="launch-day-photo">` : '';
    
    const privateDataHtml = isPrivateMode && launchDay.weather ? `
        <div class="private-section">
            <h4>🔒 Private Launch Day Data</h4>
            <div class="private-grid">
                <div><strong>Weather:</strong> Cloudy: ${launchDay.weather.cloudy ? 'Yes' : 'No'}, Muddy: ${launchDay.weather.muddy ? 'Yes' : 'No'}, Rainy: ${launchDay.weather.rainy ? 'Yes' : 'No'}, Visibility: ${launchDay.weather.visibility}</div>
                <div><strong>Time Period:</strong> ${launchDay.timePeriod}</div>
                <div><strong>Roles:</strong> ${Object.entries(launchDay.roles || {}).map(([person, role]) => `${person}: ${role}`).join(', ')}</div>
                <div><strong>Feedback:</strong> Recovery: ${launchDay.feedback?.recoveryFeedback}, Setup: ${launchDay.feedback?.rocketSetupFeedback}</div>
                <div><strong>To Improve:</strong> ${launchDay.feedback?.whatToImprove}</div>
            </div>
        </div>
    ` : '';
    
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
                ${photoHtml}
                ${privateDataHtml}
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
    
    const rocketInfo = getRocketInfo(launch.rocket);
    const rocketLink = rocketInfo ? `<a href="rockets.html" class="rocket-link">${launch.rocket}</a>` : launch.rocket;
    const rocketDetails = rocketInfo ? `<small>(${rocketInfo.diameter}" dia, ${rocketInfo.altitudeIntent}ft target)</small>` : '';
    
    const privateLaunchData = isPrivateMode && launch.rocketData ? `
        <div class="private-launch-section">
            <h5>🔒 Private Launch Data</h5>
            <p><strong>Predicted:</strong> ${launch.predictedAltitude}ft in ${launch.predictedTime}s | <strong>Actual:</strong> ${launch.altitude}ft in ${launch.time}</p>
            <p><strong>Weather:</strong> ${launch.weatherAtLaunch?.temperature}°F, ${launch.weatherAtLaunch?.windSpeed}mph ${launch.weatherAtLaunch?.windDirection}, ${launch.weatherAtLaunch?.humidity}% humidity</p>
            <p><strong>Rocket:</strong> Total mass: ${launch.rocketData.totalMass}g, Payload: ${launch.rocketData.payloadMass}oz, Chute: ${launch.rocketData.parachuteSize}"</p>
            <p><strong>Recovery:</strong> Ejection at ${launch.recovery?.ejectionTime}s, ${launch.recovery?.landing} landing, ${launch.recovery?.recovered ? 'Recovered' : 'Not recovered'}</p>
            <p><strong>Damage:</strong> ${Object.entries(launch.damage || {}).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'None'}</p>
            <p><strong>Private Notes:</strong> ${launch.privateNotes || 'None'}</p>
        </div>
    ` : '';
    
    return `
        <div class="launch-item">
            <div class="launch-header">
                <h4>${statusIcon} ${rocketLink} ${rocketDetails}</h4>
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
                ${privateLaunchData}
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

function calculateSeasonStats(data) {
    let highestAltitude = 0;
    let bestTarcScore = null;
    let maxLaunchesInDay = 0;
    let totalLaunches = 0;
    
    data.launchDays.forEach(day => {
        const dayLaunches = day.launches.length;
        totalLaunches += dayLaunches;
        maxLaunchesInDay = Math.max(maxLaunchesInDay, dayLaunches);
        
        day.launches.forEach(launch => {
            highestAltitude = Math.max(highestAltitude, launch.altitude);
            if (launch.tarcScore && (bestTarcScore === null || launch.tarcScore > bestTarcScore)) {
                bestTarcScore = launch.tarcScore;
            }
        });
    });
    
    return {
        highestAltitude,
        bestTarcScore: bestTarcScore || 'N/A',
        maxLaunchesInDay,
        totalLaunches
    };
}

function renderSeasonStats(year, stats) {
    const seasonLabel = year === 2025 ? '2024-2025' : '2025-2026';
    return `
        <div class="season-stats-card">
            <h3>📊 ${seasonLabel} Season Statistics</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Highest Altitude</span>
                    <span class="stat-value">${stats.highestAltitude} ft</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Best TARC Score</span>
                    <span class="stat-value">${stats.bestTarcScore}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Most Launches/Day</span>
                    <span class="stat-value">${stats.maxLaunchesInDay}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Launches</span>
                    <span class="stat-value">${stats.totalLaunches}</span>
                </div>
            </div>
        </div>
    `;
}

function renderLaunchDays(year) {
    const data = launchData[year];
    if (!data) return;
    
    const container = document.getElementById(`launch-days-${year}`);
    if (!container) return;
    
    const sortedDays = data.launchDays.sort((a, b) => new Date(b.date) - new Date(a.date));
    const stats = calculateSeasonStats(data);
    const seasonLabel = year === 2025 ? '2024-2025' : '2025-2026';
    
    container.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 2rem;">${seasonLabel} Launch History 🚀</h2>
        <div class="launch-timeline">
            ${sortedDays.map(day => renderLaunchDay(day)).join('')}
            ${renderSeasonStats(year, stats)}
        </div>
    `;
}

function renderRockets() {
    // New renderRockets: load rockets from data/rockets.json if present, otherwise fall back to inline rocketData
    const container = document.getElementById('rocket-grid');
    if (!container) return;

    // Try common locations for the data file: ../data (when page is in Pages/) then data/
    const tryPaths = ['../data/rockets.json', 'data/rockets.json'];
    (function tryFetch(paths) {
        if (!paths || paths.length === 0) {
            renderRocketsArray(container, rocketData.rockets || []);
            return;
        }
        const url = paths[0];
        fetch(url).then(r => {
            if (!r.ok) throw new Error('no json');
            return r.json();
        }).then(j => {
            const arr = j.rockets || [];
            renderRocketsArray(container, arr);
        }).catch(() => {
            tryFetch(paths.slice(1));
        });
    })(tryPaths);
}

function renderRocketsArray(container, rockets) {
    // Normalize creationDate and sort newest first
    const sorted = rockets.slice().sort((a,b) => new Date(b.creationDate || 0) - new Date(a.creationDate || 0));

    container.innerHTML = sorted.map(r => renderRocketCard(r)).join('');
}

function renderRocketCard(r) {
    const name = escapeHtml(r.name || '');
    const created = r.creationDate ? formatDate(r.creationDate) : 'Unknown';
    const img = r.image ? `rocket images/${r.image}` : 'https://via.placeholder.com/300x200/10b981/ffffff?text=Rocket';
    const publicNotes = r.publicNotes || r.description || '';
    const privateNotes = r.privateNotes || '';

    return `
        <div class="rocket-card">
            <img src="${img}" alt="${name}" class="rocket-image">
            <div class="rocket-info">
                <h3>${name}</h3>
                <p><strong>Created:</strong> ${created}</p>
                <p><strong>Target Altitude:</strong> ${r.altitudeIntent || 'N/A'} ft</p>
                <p><strong>Diameter:</strong> ${r.diameter || 'N/A'}"</p>
                <div class="rocket-specs">
                    ${r.length ? `<strong>Length:</strong> ${r.length}"<br>` : ''}
                    ${r.emptyMass ? `<strong>Empty Mass:</strong> ${r.emptyMass} g<br>` : ''}
                    ${r.optimalPayloadMass ? `<strong>Payload:</strong> ${r.optimalPayloadMass} oz<br>` : ''}
                    ${r.eggProtMaterial ? `<strong>Egg Protection:</strong> ${escapeHtml(r.eggProtMaterial)}<br>` : ''}
                    ${r.colorScheme ? `<strong>Color:</strong> ${escapeHtml(r.colorScheme)}<br>` : ''}
                </div>

                <div class="public-section">
                    <h4>Public Info</h4>
                    <p>${escapeHtml(publicNotes)}</p>
                </div>

                <div class="private-section" style="display: ${isPrivateMode ? 'block' : 'none'};">
                    <h4>🔒 Private Notes</h4>
                    <p>${escapeHtml(privateNotes)}</p>
                </div>
            </div>
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
        // Render planned launches for 2026 (will no-op if JSON missing)
        renderPlannedLaunches(2026);
    }
    
    // Load rocket data if on rockets page
    if (document.getElementById('rocket-grid')) {
        renderRockets();
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