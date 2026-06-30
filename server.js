require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================
// TELEGRAM DATA VALIDATION
// ============================================================

function validateTelegramData(initData, botToken) {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');
        
        const sortedParams = Array.from(params.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        const secretKey = crypto
            .createHash('sha256')
            .update(botToken)
            .digest();
        
        const computedHash = crypto
            .createHmac('sha256', secretKey)
            .update(sortedParams)
            .digest('hex');
        
        return computedHash === hash;
    } catch (error) {
        console.error('Validation error:', error);
        return false;
    }
}

// ============================================================
// API ENDPOINTS
// ============================================================

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Save shopping list
app.post('/api/shopping', (req, res) => {
    try {
        const { items, initData } = req.body;
        const botToken = process.env.BOT_TOKEN;
        
        if (!initData || !botToken) {
            return res.status(400).json({ error: 'Missing required data' });
        }
        
        const isValid = validateTelegramData(initData, botToken);
        if (!isValid) {
            console.warn('Invalid Telegram data received');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const userData = JSON.parse(
            Object.fromEntries(new URLSearchParams(initData))?.user || '{}'
        );
        const userId = userData?.id || 'unknown';
        
        console.log(`🛒 User ${userId} has ${items.length} items`);
        
        res.json({
            success: true,
            message: 'Shopping list saved successfully',
            userId: userId,
            itemCount: items.length
        });
        
    } catch (error) {
        console.error('Error saving shopping list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get shopping list
app.get('/api/shopping', (req, res) => {
    try {
        const { initData } = req.query;
        const botToken = process.env.BOT_TOKEN;
        
        if (!initData || !botToken) {
            return res.status(400).json({ error: 'Missing required data' });
        }
        
        const isValid = validateTelegramData(initData, botToken);
        if (!isValid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // For demo, return empty array (you'd fetch from database here)
        res.json({
            success: true,
            items: [],
            message: 'Retrieved shopping list successfully'
        });
        
    } catch (error) {
        console.error('Error getting shopping list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
});