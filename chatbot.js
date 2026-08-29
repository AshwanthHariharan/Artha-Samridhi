// ============================================
// ARTHA SAMRIDHI AI CHATBOT - Integration Script
// ============================================

class ChatbotApp {
    constructor() {
        this.API_KEY = "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";
        this.MODEL = "openai/gpt-5-mini";
        this.isOpen = false;
        this.isLoading = false;
        
        // DOM elements
        this.sidebar = document.getElementById('chatbotSidebar');
        this.messagesContainer = document.getElementById('chatbotMessages');
        this.input = document.getElementById('chatbotInput');
        this.sendBtn = document.querySelector('.chatbot-send-btn');
        this.toggleBtn = document.getElementById('chatbotToggle');
        
        // Bind events
        this.bindEvents();
        
        console.log('🤖 Artha Samridhi Chatbot initialized');
    }
    
    bindEvents() {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    toggle() {
        this.isOpen = !this.isOpen;
        this.sidebar.classList.toggle('open', this.isOpen);
        
        if (this.isOpen) {
            this.input.focus();
            this.createOverlay();
        } else {
            this.removeOverlay();
        }
    }
    
    createOverlay() {
        this.removeOverlay();
        
        const overlay = document.createElement('div');
        overlay.className = 'chatbot-overlay show';
        overlay.id = 'chatbotOverlay';
        overlay.addEventListener('click', () => this.toggle());
        document.body.appendChild(overlay);
    }
    
    removeOverlay() {
        const existing = document.getElementById('chatbotOverlay');
        if (existing) {
            existing.remove();
        }
    }
    
    async sendMessage() {
        const message = this.input.value.trim();
        
        if (!message) return;
        if (this.isLoading) return;
        
        this.addMessage(message, 'user');
        this.input.value = '';
        this.setLoading(true);
        
        const typingId = this.showTypingIndicator();
        
        try {
            const response = await this.callAPI(message);
            this.removeTypingIndicator(typingId);
            this.addMessage(response, 'bot');
        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.addMessage(`Sorry, I encountered an error: ${error.message}`, 'bot');
            console.error('Chatbot Error:', error);
        }
        
        this.setLoading(false);
        this.scrollToBottom();
    }
    
    async callAPI(message) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.API_KEY}`,
                    "HTTP-Referer": window.location.href,
                    "X-Title": "Artha Samridhi AI Assistant"
                },
                body: JSON.stringify({
                    model: this.MODEL,
                    messages: [
                        {
                            role: "system",
                            content: `You are a knowledgeable and professional AI assistant for **Artha Samridhi** — a comprehensive venture capitalization platform connecting entrepreneurs, investors, CA graduates, and legal advocates.

                            Your role is to help users with:
                            
                            1. **Entrepreneurs**: Guide them on how to register, upload their ideas, find investors, access government schemes (Startup India, MSME Samadhaan, Mudra Yojana, etc.), and connect with CA/legal professionals.
                            
                            2. **Investors**: Help them discover promising startups, evaluate investment opportunities, understand equity, debt, and other investment types, and connect with entrepreneurs.
                            
                            3. **CA Graduates**: Provide guidance on tax advisory, financial structuring, GST compliance, and connecting with entrepreneurs who need financial expertise.
                            
                            4. **Legal Advocates**: Assist with company registration, contract drafting, IP protection, compliance, and legal structuring for startups.
                            
                            **Key Features of Artha Samridhi:**
                            - Role-based registration and dashboards
                            - Idea upload with POC and Business Plan
                            - Government schemes and insurance partners
                            - Investor interest tracking (Low/Medium/High)
                            - CRM and advisor connections
                            - Email integration via Gmail
                            - Secure authentication with bcrypt
                            
                            **Response Style:**
                            - Be professional, friendly, and concise
                            - Provide actionable advice
                            - When mentioning specific schemes or features, be accurate
                            - Always encourage users to explore the platform
                            - For legal or financial advice, remind users to consult professionals
                            
                            **Example Topics You Can Help With:**
                            - "How do I register as an entrepreneur?"
                            - "What government schemes are available for startups?"
                            - "How can I find investors for my idea?"
                            - "What is the difference between equity and debt funding?"
                            - "How do I upload my business plan?"
                            - "What are the tax benefits for startups?"
                            
                            Be helpful, knowledgeable, and always steer users toward using the platform effectively.`
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'API Error');
            }
            
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                throw new Error('No response from AI');
            }
            
        } catch (error) {
            console.error('API Call Error:', error);
            throw error;
        }
    }
    
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'chatbot-message-avatar';
        avatar.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        const content = document.createElement('div');
        content.className = 'chatbot-message-content';
        
        // Handle markdown-like formatting
        const formattedText = this.formatMessage(text);
        content.innerHTML = formattedText;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }
    
    formatMessage(text) {
        // Convert markdown-style formatting to HTML
        let html = text;
        
        // Bold: **text** → <strong>text</strong>
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic: *text* → <em>text</em>
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Newlines to <br>
        html = html.replace(/\n/g, '<br>');
        
        // Bullet points: - text or • text
        html = html.replace(/^[\s]*[-•][\s]+/gm, '• ');
        
        // Numbered lists: 1. text
        html = html.replace(/^[\s]*(\d+)\.\s+/gm, '<strong>$1.</strong> ');
        
        return html;
    }
    
    showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.className = 'chatbot-message bot';
        div.id = id;
        
        const avatar = document.createElement('div');
        avatar.className = 'chatbot-message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const content = document.createElement('div');
        content.className = 'chatbot-message-content';
        content.innerHTML = `
            <div class="chatbot-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        div.appendChild(avatar);
        div.appendChild(content);
        
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
        
        return id;
    }
    
    removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading;
        this.input.disabled = loading;
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 50);
    }
    
    // Quick response suggestions
    getQuickResponses() {
        return [
            '🚀 Register as Entrepreneur',
            '💰 Find Investors',
            '📋 Government Schemes',
            '📤 Upload Idea'
        ];
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

let chatbotInstance = null;

function toggleChatbot() {
    if (!chatbotInstance) {
        chatbotInstance = new ChatbotApp();
    }
    chatbotInstance.toggle();
}

function sendChatbotMessage() {
    if (!chatbotInstance) {
        chatbotInstance = new ChatbotApp();
    }
    chatbotInstance.sendMessage();
}

function handleChatbotKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendChatbotMessage();
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 Artha Samridhi Chatbot script loaded');
    console.log('💡 Type "help" to see what I can do!');
});

// Quick actions for developers
window.ArthaChatbot = {
    toggle: toggleChatbot,
    send: sendChatbotMessage,
    instance: () => chatbotInstance
};

// Expose for global use
window.toggleChatbot = toggleChatbot;
window.sendChatbotMessage = sendChatbotMessage;
window.handleChatbotKeypress = handleChatbotKeypress;