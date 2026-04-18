const API_URL = window.location.host.includes('localhost') 
  ? 'http://localhost:8000' 
  : 'https://advokatura.uz';
let ws = null;
let conversationId = null;
let currentSubject = '';

const screens = {
  welcome: document.getElementById('welcome-screen'),
  subject: document.getElementById('subject-screen'),
  chat: document.getElementById('chat-screen'),
  loading: document.getElementById('loading-screen'),
  error: document.getElementById('error-screen')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

async function verifyTelegram() {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) {
    showError('Telegram ma\'lumotlari topilmadi');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/telegram/verify/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
      body: JSON.stringify({ init_data: initData })
    });

    const data = await response.json();

    if (data.conversation_id) {
      conversationId = data.conversation_id;
      connectWebSocket();
    } else {
      showError(data.error || 'Verifikatsiya muvaffaqiyatsiz');
    }
  } catch (err) {
    showError('Serverga ulanish xatoligi');
  }
}

function connectWebSocket() {
  const isLocal = window.location.host.includes('localhost');
  const protocol = isLocal ? 'ws:' : 'wss:';
  const host = isLocal ? 'localhost:8000' : 'advokatura.uz';
  const wsUrl = `${protocol}//${host}/ws/chat/${conversationId}/`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    showScreen('chat');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'message') {
      addMessage(data.text, data.sender);
    } else if (data.type === 'typing') {
      toggleTyping(data.is_typing);
    }
  };

  ws.onerror = () => {
    showError('WebSocket xatoligi');
  };

  ws.onclose = () => {
    showError('Ulanish uzildi');
  };
}

function addMessage(text, sender) {
  const container = document.getElementById('messages-container');
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function toggleTyping(show) {
  const indicator = document.getElementById('typing-indicator');
  indicator.classList.toggle('hidden', !show);
}

function sendMessage(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    type: 'message',
    text: text
  }));

  addMessage(text, 'user');
}

function showError(message) {
  document.getElementById('error-message').textContent = message;
  showScreen('error');
}

document.getElementById('start-btn').addEventListener('click', () => {
  showScreen('subject');
});

document.getElementById('subject-next-btn').addEventListener('click', () => {
  currentSubject = document.getElementById('subject-select').value;
  showScreen('loading');
  verifyTelegram();
});

document.getElementById('send-btn').addEventListener('click', () => {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (text) {
    sendMessage(text);
    input.value = '';
  }
});

document.getElementById('message-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const text = e.target.value.trim();
    if (text) {
      sendMessage(text);
      e.target.value = '';
    }
  }
});

document.getElementById('retry-btn').addEventListener('click', () => {
  showScreen('loading');
  verifyTelegram();
});

Telegram.WebApp.ready();
Telegram.WebApp.expand();