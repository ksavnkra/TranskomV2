const chatHistory = [];

function createChatbotWidget() {
    const container = document.createElement('div');
    container.className = 'chatbot-container';
    container.innerHTML = `
        <div class="chatbot-window" id="chatWindow">
            <div class="chatbot-header">
                <h3><i class="fas fa-robot"></i> Transkom Support</h3>
                <button class="chatbot-close" id="closeChatBtn"><i class="fas fa-times"></i></button>
            </div>
            <div class="chatbot-messages" id="chatMessages">
                <div class="chat-bubble bot">Hello! I'm your Transkom AI assistant. How can I help you with your currency exchange today?</div>
                <div class="typing-indicator" id="typingIndicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
            <form class="chatbot-input-area" id="chatForm">
                <input type="text" id="chatInput" placeholder="Type your message..." autocomplete="off" maxlength="500">
                <button type="submit" class="chatbot-send"><i class="fas fa-paper-plane"></i></button>
            </form>
        </div>
        <button class="chatbot-toggle" id="toggleChatBtn">
            <i class="fas fa-comment-dots"></i>
        </button>
    `;

    document.body.appendChild(container);

    // Event Listeners
    document.getElementById('toggleChatBtn').addEventListener('click', () => {
        document.getElementById('chatWindow').classList.toggle('active');
    });

    document.getElementById('closeChatBtn').addEventListener('click', () => {
        document.getElementById('chatWindow').classList.remove('active');
    });

    document.getElementById('chatForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;

        appendMessage('user', message);
        input.value = '';

        // Show typing indicator
        document.getElementById('typingIndicator').style.display = 'block';
        scrollToBottom();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: chatHistory })
            });

            document.getElementById('typingIndicator').style.display = 'none';

            if (response.ok) {
                const data = await response.json();
                appendMessage('bot', data.reply);

                // Update history
                chatHistory.push({ role: 'user', content: message });
                chatHistory.push({ role: 'model', content: data.reply });
            } else {
                appendMessage('bot', "I'm sorry, I'm having trouble connecting right now.");
            }
        } catch (error) {
            console.error(error);
            document.getElementById('typingIndicator').style.display = 'none';
            appendMessage('bot', "Connection error. Please try again later.");
        }
    });

    // Initial greeting visual fix
    setTimeout(scrollToBottom, 100);
}

function appendMessage(sender, text) {
    const messagesDiv = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-bubble ${sender}`;

    // SAFE: Use textContent to prevent XSS, then convert URLs to links safely
    msgDiv.textContent = text;

    // Insert before typing indicator
    const typingIndicator = document.getElementById('typingIndicator');
    messagesDiv.insertBefore(msgDiv, typingIndicator);

    scrollToBottom();
}

function scrollToBottom() {
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', createChatbotWidget);
