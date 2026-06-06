const tableBody = document.querySelector('tbody');

const modal = document.getElementById('id-card-modal');
const closeBtn = document.querySelector('.close-btn');

const cardUsername = document.getElementById('cardUsername');
const cardRank = document.getElementById('card-rank');
const cardAssignments = document.getElementById('card-assignments');
const cardJoinDate = document.getElementById('card-join-date');
const cardActivity = document.getElementById('card-activity');
const cardExcuse = document.getElementById('card-excuse');
const cardPoints = document.getElementById('card-points');
const cardAvatar = document.getElementById('card-avatar');

function filterORBAT(rawData) {
    const onlyMembers = rawData.filter(row => {
        return row.Username && row.Username !== 'IGB' && row.Username !== 'CO' && row.Username !== 'NCO' && row.Username !== 'Guardsman' && row.Username !== 'RETIRED' 
    });
    const filteredData = onlyMembers.map(row => {
        return {
            username: row.Username,
            rank: row.Rank,
            assignements: row.Assignments,
            joinDate: row['Join Date'],
            activityStatus: row['Activity Status'],
            excuseStatus: row['Excuse Status'],
            atPoints: row['All-Time Points']
        };
    });

    return filteredData;
}

const orbatURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQBrjR-G-7yBeyLsGEdlLwu2Fo56WuCbQkopQkHqb5x0kDrrIuug0Tia5vg9f8LTONGtfItcxQG03OD/pub?gid=378698214&single=true&output=csv';
fetch(orbatURL)
    .then(response => response.text())
    .then(csvText => {
        const rows = csvText.split('\n');

        const relevantLines = rows.slice(3);
        if (relevantLines.length === 0) return;

        const headers = relevantLines[0].split(',').map(h => h.trim());

        const dataLines = relevantLines.slice(1);
        const rawObjects = dataLines.map(line => {
            const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            let entry = {};

            headers.forEach((header, index) => {
                entry[header] = columns[index] ? columns[index].trim().replace(/^"|"$|/g, '') : '';
            });
            return entry;
        });
        
        console.log("RAW OBJECT TEST:", rawObjects[0]);
        const cleanMembers = filterORBAT(rawObjects);

        console.log("Filtered Members", cleanMembers);

        tableBody.innerHTML = '';

        cleanMembers.forEach(member => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${member.username}</td>
                <td>${member.rank}</td>
                <td>${member.assignements || 'None'}</td>
                <td>${member.joinDate}</td>
                <td>${member.activityStatus}</td>
                <td>${member.excuseStatus}</td>
                <td>${member.atPoints || '0'}</td>
            `;

            row.addEventListener('click', () => {
                cardUsername.textContent = member.username;
                cardRank.textContent = member.rank;
                cardAssignments.textContent = member.assignements || 'None';
                cardJoinDate.textContent = member.joinDate;
                cardActivity.textContent = member.activityStatus;
                cardExcuse.textContent = member.excuseStatus;
                cardPoints.textContent = member.atPoints || '0';

              async function loadAvatar(username, imgElement) {
                    try {
                        // Erstmal die Klasse entfernen, damit es beim nächsten Klick wieder ausgeblendet ist
                        imgElement.classList.remove('loaded');
                        
                        const response = await fetch(`/api/get-user?username=${encodeURIComponent(username)}`);
                        const data = await response.json();
                        
                        if (data && data.avatarUrl) {
                            // Wenn das Bild fertig geladen ist, Klasse hinzufügen
                            imgElement.onload = () => {
                                imgElement.classList.add('loaded');
                            };
                            imgElement.src = data.avatarUrl;
                        }
                    } catch (err) {
                        console.error("Fehler:", err);
                    }
                }

                cardPoints.textContent = member.atPoints || '0';
                cardAvatar.src = "";
                loadAvatar(member.username.trim(), cardAvatar);
                modal.style.display = 'block';
            });

            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error fetching ORBAT data:', error);
    });

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
