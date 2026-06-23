// ===== Configuration =====
const API_BASE = 'https://human-success-backend-1.onrender.com';

// Render markdown with single line-breaks honored
if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
}

// ===== State =====
let userId = localStorage.getItem('human_success_user_id');
let sessionId = localStorage.getItem('human_success_session_id') || generateSessionId();
let messageCount = parseInt(localStorage.getItem('message_count') || '0');
let phase = localStorage.getItem('current_phase') || 'safety';
let isProcessing = false;

if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('human_success_user_id', userId);
}
localStorage.setItem('human_success_session_id', sessionId);

// ===== DOM elements =====
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
sendButton.onclick = sendMessage;
const micButton = document.getElementById('mic-button');
const typingIndicator = document.getElementById('typing-indicator');
const thinkingText = document.getElementById('thinking-text');
const evidenceList = document.getElementById('evidence-list');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const newJourneyBtn = document.getElementById('new-journey');

const phaseSafety = document.getElementById('phase-safety');
const phaseImagination = document.getElementById('phase-imagination');
const phaseMechanism = document.getElementById('phase-mechanism');
const dayCounter = document.getElementById('day-counter');

// ===== Initialize =====
updatePhaseUI();
loadEvidence();

// Menu toggle (mobile)
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Enter to send
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ===== Voice input (Web Speech API) =====
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition && micButton) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let baseText = '';

    recognition.onstart = () => {
        isListening = true;
        micButton.classList.add('listening');
        micButton.title = 'Listening\u2026 tap to stop';
    };
    recognition.onend = () => {
        isListening = false;
        micButton.classList.remove('listening');
        micButton.title = 'Speak your message';
    };
    recognition.onerror = () => {
        isListening = false;
        micButton.classList.remove('listening');
    };
    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        userInput.value = (baseText ? baseText + ' ' : '') + transcript;
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    };

    micButton.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
            return;
        }
        baseText = userInput.value.trim();
        try { recognition.start(); } catch (e) { /* already started */ }
        userInput.focus();
    });
} else if (micButton) {
    // Voice not supported in this browser — hide the mic so nothing looks broken
    micButton.style.display = 'none';
}

// ===== Thinking indicator (rotating shimmer) =====
let thinkingTimer = null;
const thinkingPhrases = [
    'Thinking',
    'Reflecting on your design',
    'Considering this with care',
    'Almost there'
];

function startThinking() {
    let i = 0;
    if (thinkingText) thinkingText.textContent = thinkingPhrases[0];
    typingIndicator.style.display = 'flex';
    thinkingTimer = setInterval(() => {
        i = (i + 1) % thinkingPhrases.length;
        if (thinkingText) thinkingText.textContent = thinkingPhrases[i];
    }, 4200);
}

function stopThinking() {
    typingIndicator.style.display = 'none';
    if (thinkingTimer) { clearInterval(thinkingTimer); thinkingTimer = null; }
}

// ===== Send message =====
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;

    if (isListening && recognition) { recognition.stop(); }

    userInput.value = '';
    userInput.style.height = 'auto';

    addMessageToChat('user', message);

    isProcessing = true;
    sendButton.disabled = true;
    startThinking();
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(API_BASE + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                user_id: userId,
                session_id: sessionId
            })
        });

        const data = await response.json();
        stopThinking();

        if (data.error) {
            addMessageToChat('guide', 'I am having trouble connecting. Please try again in a moment.');
        } else {
            addMessageToChat('guide', data.response, data.tools_used);
            messageCount++;
            localStorage.setItem('message_count', messageCount.toString());
            updatePhaseFromCount();

            if (data.tools_used && data.tools_used.includes('record_evidence')) {
                loadEvidence();
            }
        }
    } catch (error) {
        stopThinking();
        addMessageToChat('guide', 'I am having trouble connecting. Please check your connection and try again.');
        console.error('Error:', error);
    } finally {
        isProcessing = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// ===== Render a message =====
function addMessageToChat(role, content, toolsUsed = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (role === 'user') {
        // Plain text, preserve line breaks, no markdown
        content.split('\n').filter(p => p.trim()).forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            contentDiv.appendChild(p);
        });
    } else {
        // Render markdown so **bold**, headings, lists and quotes display properly
        try {
            contentDiv.innerHTML = window.marked
                ? marked.parse(content)
                : content.split('\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('');
        } catch (e) {
            contentDiv.innerHTML = content.split('\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('');
        }

        if (toolsUsed && toolsUsed.length > 0) {
            const badges = document.createElement('div');
            badges.className = 'tool-badges';
            badges.innerHTML = toolsUsed.map(tool =>
                `<span class="tool-badge">${escapeHtml(tool.replace(/_/g, ' '))}</span>`
            ).join('');
            contentDiv.appendChild(badges);
        }
    }

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Evidence =====
async function loadEvidence() {
    try {
        const response = await fetch(API_BASE + '/evidence/' + userId);
        const data = await response.json();

        if (data.evidence && data.evidence.length > 0) {
            evidenceList.innerHTML = '';
            data.evidence.slice().reverse().forEach(item => {
                const date = new Date(item.timestamp).toLocaleDateString();
                const wrap = document.createElement('div');
                wrap.className = 'evidence-item';
                const text = document.createElement('div');
                text.className = 'evidence-text';
                text.textContent = '\u201C' + item.evidence + '\u201D';
                const meta = document.createElement('div');
                meta.className = 'evidence-meta';
                meta.textContent = item.category + ' \u2022 ' + date;
                wrap.appendChild(text);
                wrap.appendChild(meta);
                evidenceList.appendChild(wrap);
            });
        } else {
            evidenceList.innerHTML = '<p class="empty-evidence">Your evidence will appear here</p>';
        }
    } catch (error) {
        console.error('Error loading evidence:', error);
    }
}

// ===== Phases =====
function updatePhaseFromCount() {
    if (messageCount < 10) {
        phase = 'safety';
    } else if (messageCount < 20) {
        phase = 'imagination';
    } else {
        phase = 'mechanism';
    }
    localStorage.setItem('current_phase', phase);
    updatePhaseUI();
}

function updatePhaseUI() {
    phaseSafety.classList.remove('active');
    phaseImagination.classList.remove('active');
    phaseMechanism.classList.remove('active');

    if (phase === 'safety') {
        phaseSafety.classList.add('active');
    } else if (phase === 'imagination') {
        phaseImagination.classList.add('active');
    } else {
        phaseMechanism.classList.add('active');
    }

    const day = Math.min(Math.floor(messageCount / 2) + 1, 21);
    dayCounter.textContent = `Day ${day} of 21`;
}

// ===== New journey =====
newJourneyBtn.addEventListener('click', async () => {
    if (confirm('Start a new journey? This will clear your conversation history.')) {
        try {
            await fetch(API_BASE + '/user/' + userId, { method: 'DELETE' });
        } catch (error) {
            console.error('Error clearing user data:', error);
        }

        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionId = generateSessionId();
        messageCount = 0;
        phase = 'safety';

        localStorage.setItem('human_success_user_id', userId);
        localStorage.setItem('human_success_session_id', sessionId);
        localStorage.setItem('message_count', '0');
        localStorage.setItem('current_phase', 'safety');

        chatMessages.innerHTML = `
            <div class="message guide">
                <div class="message-content">
                    <p>Welcome. I'm here to help you understand how you were designed&mdash;spiritually, neurologically, and biologically.</p>
                    <p>Before we go anywhere, let's start here: How are you right now, in this moment? Not how you think you should be. How you actually are.</p>
                    <p class="message-footnote">Take your time. There's no rush.</p>
                </div>
            </div>
        `;

        evidenceList.innerHTML = '<p class="empty-evidence">Your evidence will appear here</p>';
        updatePhaseUI();
    }
});

// ===== Helpers =====
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===== Load journey on startup =====
async function loadJourney() {
    try {
        const response = await fetch(API_BASE + '/journey/' + userId);
        const data = await response.json();

        messageCount = data.message_count || 0;
        phase = data.current_phase || 'safety';

        localStorage.setItem('message_count', messageCount.toString());
        localStorage.setItem('current_phase', phase);

        updatePhaseUI();
    } catch (error) {
        console.error('Error loading journey:', error);
    }
}

loadJourney();
