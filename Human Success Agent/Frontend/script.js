// State
let userId = localStorage.getItem('human_success_user_id');
let sessionId = localStorage.getItem('human_success_session_id') || generateSessionId();
let messageCount = parseInt(localStorage.getItem('message_count') || '0');
let phase = localStorage.getItem('current_phase') || 'safety';
let isProcessing = false;
// API URL - CHANGE THIS TO YOUR BACKEND URL
const API_URL = 'https://human-success-backend-1.onrender.com';

// Generate IDs if needed
if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('human_success_user_id', userId);
}
localStorage.setItem('human_success_session_id', sessionId);

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const evidenceList = document.getElementById('evidence-list');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const newJourneyBtn = document.getElementById('new-journey');

// Phase elements
const phaseSafety = document.getElementById('phase-safety');
const phaseImagination = document.getElementById('phase-imagination');
const phaseMechanism = document.getElementById('phase-mechanism');
const dayCounter = document.getElementById('day-counter');

// Initialize
updatePhaseUI();
loadEvidence();

// Menu toggle for mobile
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Handle Enter key
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Send message
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Add user message to UI
    addMessageToChat('user', message);
    
    // Show typing indicator
    isProcessing = true;
    sendButton.disabled = true;
    typingIndicator.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                user_id: userId,
                session_id: sessionId
            })
        });
        
        const data = await response.json();
        
        // Hide typing indicator
        typingIndicator.style.display = 'none';
        
        if (data.error) {
            addMessageToChat('guide', 'I am having trouble connecting. Please try again in a moment.');
        } else {
            addMessageToChat('guide', data.response, data.tools_used);
            messageCount++;
            localStorage.setItem('message_count', messageCount.toString());
            
            // Update phase based on message count
            updatePhaseFromCount();
            
            // Check if this response might have recorded evidence
            if (data.tools_used && data.tools_used.includes('record_evidence')) {
                loadEvidence(); // Refresh evidence list
            }
        }
        
    } catch (error) {
        typingIndicator.style.display = 'none';
        addMessageToChat('guide', 'I am having trouble connecting. Please check your connection and try again.');
        console.error('Error:', error);
    } finally {
        isProcessing = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Add message to UI
function addMessageToChat(role, content, toolsUsed = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    let toolBadges = '';
    if (toolsUsed && toolsUsed.length > 0) {
        toolBadges = toolsUsed.map(tool => 
            `<span class="tool-badge">⚙️ ${tool.replace(/_/g, ' ')}</span>`
        ).join('');
    }
    
    // Format content with paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${paragraphs}
            ${toolBadges ? `<div>${toolBadges}</div>` : ''}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Load evidence from server
async function loadEvidence() {
    try {
        const response = await fetch(`${API_URL}/evidence/${userId}`);
        const data = await response.json();
        
        if (data.evidence && data.evidence.length > 0) {
            evidenceList.innerHTML = '';
            data.evidence.slice().reverse().forEach(item => {
                const date = new Date(item.timestamp).toLocaleDateString();
                evidenceList.innerHTML += `
                    <div class="evidence-item">
                        <div class="evidence-text">"${item.evidence}"</div>
                        <div class="evidence-meta">${item.category} • ${date}</div>
                    </div>
                `;
            });
        } else {
            evidenceList.innerHTML = '<p class="empty-evidence">Your evidence will appear here</p>';
        }
    } catch (error) {
        console.error('Error loading evidence:', error);
    }
}

// Update phase UI based on message count
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

// Update phase indicators
function updatePhaseUI() {
    // Remove active class from all
    phaseSafety.classList.remove('active');
    phaseImagination.classList.remove('active');
    phaseMechanism.classList.remove('active');
    
    // Add active class to current phase
    if (phase === 'safety') {
        phaseSafety.classList.add('active');
    } else if (phase === 'imagination') {
        phaseImagination.classList.add('active');
    } else {
        phaseMechanism.classList.add('active');
    }
    
    // Update day counter
    const day = Math.min(Math.floor(messageCount / 2) + 1, 21);
    dayCounter.textContent = `Day ${day} of 21`;
}

// New journey
newJourneyBtn.addEventListener('click', async () => {
    if (confirm('Start a new journey? This will clear your conversation history.')) {
        try {
            await fetch(`${API_URL}/user/${userId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error clearing user data:', error);
        }
        
        // Reset local state
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionId = generateSessionId();
        messageCount = 0;
        phase = 'safety';
        
        localStorage.setItem('human_success_user_id', userId);
        localStorage.setItem('human_success_session_id', sessionId);
        localStorage.setItem('message_count', '0');
        localStorage.setItem('current_phase', 'safety');
        
        // Clear UI
        chatMessages.innerHTML = `
            <div class="message guide">
                <div class="message-content">
                    <p>Welcome. I'm here to help you understand how you were designed—spiritually, neurologically, and biologically.</p>
                    <p>Before we go anywhere, let's start here: How are you right now, in this moment? Not how you think you should be. How you actually are.</p>
                    <p class="message-footnote">Take your time. There's no rush.</p>
                </div>
            </div>
        `;
        
        evidenceList.innerHTML = '<p class="empty-evidence">Your evidence will appear here</p>';
        updatePhaseUI();
    }
});
        
        // Reset local state
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionId = generateSessionId();
        messageCount = 0;
        phase = 'safety';
        
        localStorage.setItem('human_success_user_id', userId);
        localStorage.setItem('human_success_session_id', sessionId);
        localStorage.setItem('message_count', '0');
        localStorage.setItem('current_phase', 'safety');
        
        // Clear UI
        chatMessages.innerHTML = `
            <div class="message guide">
                <div class="message-content">
                    <p>Welcome. I'm here to help you understand how you were designed—spiritually, neurologically, and biologically.</p>
                    <p>Before we go anywhere, let's start here: How are you right now, in this moment? Not how you think you should be. How you actually are.</p>
                    <p class="message-footnote">Take your time. There's no rush.</p>
                </div>
            </div>
        `;
        
        evidenceList.innerHTML = '<p class="empty-evidence">Your evidence will appear here</p>';
        updatePhaseUI();
    }
});

// Generate session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load journey on startup
async function loadJourney() {
    try {
        const response = await fetch(`${API_URL}/journey/${userId}`);
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

// Start
loadJourney();
