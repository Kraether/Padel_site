let teams = JSON.parse(localStorage.getItem("teams") || "[]");
let dragSrcIndex = null;

function save() {
  localStorage.setItem("teams", JSON.stringify(teams));
}

/* --- Normalisering --- */
function normalizeRankedin(value) {
  if (!value) return 0;
  const v = parseFloat(value.replace(",", "."));
  if (isNaN(v)) return 0;
  return v / 10; // antager typisk 0–10+
}

function normalizePadelLink(value) {
  if (!value) return 0;
  const v = parseFloat(value.replace(",", "."));
  if (isNaN(v)) return 0;
  return (v - 1) / 6; // 1–7 → 0–1
}

/* --- Spiller-score --- */
function playerScore(player) {
  const r = normalizeRankedin(player.rankedin);
  const p = normalizePadelLink(player.padelLink);
  return (r + p) / 2; // lige vægt
}

/* --- Team-score --- */
function teamScore(team) {
  const s1 = playerScore(team.players[0]);
  const s2 = playerScore(team.players[1]);
  return (s1 + s2) / 2;
}

/* --- Import fra Excel (A=FirstName, B=LastName, C=Rankedin, D=PadelLink) --- */
function importTeams() {
  const text = document.getElementById("importData").value.trim();
  if (!text) {
    alert("Indsæt data først.");
    return;
  }

  const pairCount = getPairCount();
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length !== pairCount * 2) {
    alert("Der skal være præcis " + (pairCount * 2) + " linjer (2 spillere pr. par × " + pairCount + " par).");
    return;
  }

  const parsedPlayers = lines.map((line, idx) => {
    const parts = line.split(/\t+/); // TAB-separeret
    if (parts.length < 4) {
      alert(
        "Linje " +
          (idx + 1) +
          " skal have 4 kolonner: Fornavn[TAB]Efternavn[TAB]Rankedin[TAB]PadelLink"
      );
      throw new Error("Invalid format");
    }

    const firstName = parts[0].trim();
    const lastName = parts[1].trim();
    const rankedin = parts[2].trim();
    const padelLink = parts[3].trim();

    const name = (firstName + " " + lastName).trim();

    return { name, rankedin, padelLink };
  });

  // Byg teams (linje 1+2 = par 1, 3+4 = par 2, osv.)
  teams = [];
  for (let i = 0; i < pairCount * 2; i += 2) {
    const p1 = parsedPlayers[i];
    const p2 = parsedPlayers[i + 1];

    teams.push({
      teamName: `${p1.name} / ${p2.name}`,
      players: [
        { name: p1.name, rankedin: p1.rankedin, padelLink: p1.padelLink },
        { name: p2.name, rankedin: p2.rankedin, padelLink: p2.padelLink }
      ]
    });
  }

  save();
  renderTeams();
  alert("Import gennemført.");
}

/* --- Render seedings --- */
function renderTeams() {
  const list = document.getElementById("teamList");
  if (!list) return;
  list.innerHTML = "";

  teams.forEach((team, index) => {
    const score = teamScore(team).toFixed(3);

    const li = document.createElement("li");
    li.className = "team-item";
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
      <div class="team-header">
        <span>#${index + 1}</span>
        <span>${team.teamName} (${score})</span>
      </div>
      <div class="team-players">
        <div>
          <strong>${team.players[0].name}</strong>
          &nbsp;R: ${team.players[0].rankedin || "-"}
          &nbsp;P: ${team.players[0].padelLink || "-"}
          &nbsp;S: ${playerScore(team.players[0]).toFixed(3)}
        </div>
        <div>
          <strong>${team.players[1].name}</strong>
          &nbsp;R: ${team.players[1].rankedin || "-"}
          &nbsp;P: ${team.players[1].padelLink || "-"}
          &nbsp;S: ${playerScore(team.players[1]).toFixed(3)}
        </div>
      </div>
    `;

    li.addEventListener("dragstart", onDragStart);
    li.addEventListener("dragover", onDragOver);
    li.addEventListener("drop", onDrop);
    li.addEventListener("dragend", onDragEnd);

    list.appendChild(li);
  });
}

/* --- Drag & drop --- */
function onDragStart(e) {
  dragSrcIndex = Number(e.currentTarget.dataset.index);
  e.currentTarget.classList.add("dragging");
}

function onDragOver(e) {
  e.preventDefault();
}

function onDrop(e) {
  e.preventDefault();
  const targetIndex = Number(e.currentTarget.dataset.index);
  if (dragSrcIndex === targetIndex || dragSrcIndex === null) return;

  const moved = teams.splice(dragSrcIndex, 1)[0];
  teams.splice(targetIndex, 0, moved);

  save();
  renderTeams();
}

function onDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  dragSrcIndex = null;
}

/* --- Bracket (kun kvartfinaler for nu) --- */
function generateBracket() {
  const bracket = document.getElementById("bracket");
  if (!bracket) return;
  bracket.innerHTML = "";

  const pairCount = getPairCount();
  if (teams.length !== pairCount) {
    alert("Du skal have præcis " + pairCount + " par for denne bracket.");
    return;
  }

  const roundTitles = { 4: "Semifinaler", 8: "Kvartfinaler", 16: "Ottendedelsfinaler" };
  const roundTitle = roundTitles[pairCount] || (pairCount + "-dobbelt");

  const round1 = document.createElement("div");
  round1.className = "round";
  round1.innerHTML = `<div class="round-title">${roundTitle}</div>`;

  for (let i = 0; i < pairCount; i += 2) {
    const t1 = teams[i];
    const t2 = teams[i + 1];

    const match = document.createElement("div");
    match.className = "match";

    match.innerHTML = `
      <div>
        <strong>${t1.teamName}</strong> (${teamScore(t1).toFixed(3)})<br>
        ${t1.players[0].name}
        (R:${t1.players[0].rankedin} / P:${t1.players[0].padelLink} / S:${playerScore(t1.players[0]).toFixed(3)})<br>
        ${t1.players[1].name}
        (R:${t1.players[1].rankedin} / P:${t1.players[1].padelLink} / S:${playerScore(t1.players[1]).toFixed(3)})
      </div>
      <hr>
      <div>
        <strong>${t2.teamName}</strong> (${teamScore(t2).toFixed(3)})<br>
        ${t2.players[0].name}
        (R:${t2.players[0].rankedin} / P:${t2.players[0].padelLink} / S:${playerScore(t2.players[0]).toFixed(3)})<br>
        ${t2.players[1].name}
        (R:${t2.players[1].rankedin} / P:${t2.players[1].padelLink} / S:${playerScore(t2.players[1]).toFixed(3)})
      </div>
    `;

    round1.appendChild(match);
  }

  bracket.appendChild(round1);
}

/* --- Antal par --- */
function getPairCount() {
  const el = document.getElementById("scaleRange");
  return el ? Number(el.value) : 8;
}

function updateScale(value) {
  const el = document.getElementById("scaleValue");
  if (el) el.textContent = value + " par";
}

/* Init */
renderTeams();
updateScale(8);
