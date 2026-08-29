require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== MULTER CONFIGURATION FOR FILE UPLOADS =====
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX files are allowed'));
        }
    }
});

// Data storage file
const DATA_FILE = path.join(__dirname, 'users.json');

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    console.log('✅ users.json created');
}

// Helper functions
const readUsers = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users file:', error);
        return [];
    }
};

const writeUsers = (users) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error writing users file:', error);
    }
};

// ===== REGISTRATION ENDPOINT =====
app.post('/api/register', async (req, res) => {
    try {
        const userData = req.body;
        console.log('📝 Registration attempt for:', userData.email);
        
        const requiredFields = ['fullName', 'dob', 'email', 'mobile', 'role', 'password', 'confirmPassword'];
        for (const field of requiredFields) {
            if (!userData[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }

        if (userData.password !== userData.confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const passwordStrength = checkPasswordStrength(userData.password);
        if (passwordStrength.score < 3) {
            return res.status(400).json({ 
                error: 'Password is too weak. Please use a stronger password.',
                strength: passwordStrength
            });
        }

        const users = readUsers();
        const existingUser = users.find(u => u.email === userData.email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const newUser = {
            id: uuidv4(),
            fullName: userData.fullName,
            dob: userData.dob,
            email: userData.email,
            mobile: userData.mobile,
            role: userData.role,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            ideas: [],
            ...(userData.role === 'INVESTOR' && {
                investorDetails: {
                    amount: userData.amount || null,
                    portfolios: userData.portfolios || null,
                    industry: userData.industry || null,
                    firmType: userData.firmType || null,
                    qualification: userData.qualification || null,
                    natureOfInvestment: userData.natureOfInvestment || null
                }
            }),
            ...(userData.role === 'ENTREPRENEUR' && {
                entrepreneurDetails: {
                    companyName: userData.companyName || null,
                    industry: userData.industry || null,
                    stage: userData.stage || null,
                    fundingGoal: userData.fundingGoal || null,
                    teamSize: userData.teamSize || null,
                    qualification: userData.entrepreneurQualification || null
                }
            }),
            ...(userData.role === 'CA_GRADUATE' && {
                caDetails: {
                    registrationNumber: userData.registrationNumber || null,
                    specialization: userData.specialization || null,
                    experience: userData.experience || null,
                    firmName: userData.firmName || null
                }
            }),
            ...(userData.role === 'ADVOCATE' && {
                advocateDetails: {
                    barCouncilId: userData.barCouncilId || null,
                    specialization: userData.specialization || null,
                    experience: userData.experience || null,
                    firmName: userData.firmName || null,
                    courtPracticed: userData.courtPracticed || null
                }
            })
        };

        const userResponse = { ...newUser };
        delete userResponse.password;

        users.push(newUser);
        writeUsers(users);
        console.log('✅ User registered successfully:', userData.email);

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            user: userResponse
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== LOGIN ENDPOINT =====
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Login attempt for:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const users = readUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const userResponse = { ...user };
        delete userResponse.password;

        console.log('✅ Login successful:', email);
        res.json({
            success: true,
            message: 'Login successful!',
            user: userResponse
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== GET USER BY ID =====
app.get('/api/user/:id', (req, res) => {
    try {
        const users = readUsers();
        const user = users.find(u => u.id === req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userResponse = { ...user };
        delete userResponse.password;

        res.json({ user: userResponse });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== GET ALL USERS =====
app.get('/api/users', (req, res) => {
    try {
        const users = readUsers();
        const usersResponse = users.map(user => {
            const { password, ...rest } = user;
            return rest;
        });
        res.json({ users: usersResponse });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== GET ALL ADVOCATES =====
app.get('/api/advocates', (req, res) => {
    try {
        const users = readUsers();
        const advocates = users
            .filter(user => user.role === 'ADVOCATE')
            .map(user => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile,
                advocateDetails: user.advocateDetails || {}
            }));
        
        res.json({ 
            success: true, 
            advocates: advocates,
            count: advocates.length
        });
    } catch (error) {
        console.error('Error fetching advocates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== GET ALL CA GRADUATES =====
app.get('/api/ca-graduates', (req, res) => {
    try {
        const users = readUsers();
        const caGraduates = users
            .filter(user => user.role === 'CA_GRADUATE')
            .map(user => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile,
                caDetails: user.caDetails || {}
            }));
        
        res.json({ 
            success: true, 
            caGraduates: caGraduates,
            count: caGraduates.length
        });
    } catch (error) {
        console.error('Error fetching CA graduates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== UPLOAD IDEA ENDPOINT =====
app.post('/api/upload-idea', upload.fields([
    { name: 'pocReport', maxCount: 1 },
    { name: 'businessPlan', maxCount: 1 }
]), async (req, res) => {
    try {
        const { entrepreneurId, capitalNeeded, ideaAbstract } = req.body;
        
        console.log('📤 Upload idea attempt for entrepreneur:', entrepreneurId);
        
        if (!entrepreneurId || !capitalNeeded || !ideaAbstract) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pocReport = req.files['pocReport'] ? req.files['pocReport'][0] : null;
        const businessPlan = req.files['businessPlan'] ? req.files['businessPlan'][0] : null;

        if (!pocReport || !businessPlan) {
            return res.status(400).json({ error: 'Both POC Report and Business Plan are required' });
        }

        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === entrepreneurId);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newIdea = {
            id: Date.now(),
            entrepreneurId: entrepreneurId,
            entrepreneurName: users[userIndex].fullName,
            companyName: users[userIndex].entrepreneurDetails?.companyName || 'N/A',
            capitalNeeded: capitalNeeded,
            ideaAbstract: ideaAbstract,
            pocReportName: pocReport.originalname,
            pocReportPath: `uploads/${pocReport.filename}`,
            businessPlanName: businessPlan.originalname,
            businessPlanPath: `uploads/${businessPlan.filename}`,
            submittedAt: new Date().toISOString(),
            status: 'Pending Review'
        };

        if (!users[userIndex].ideas) {
            users[userIndex].ideas = [];
        }

        users[userIndex].ideas.push(newIdea);
        writeUsers(users);

        console.log('✅ Idea uploaded successfully for:', users[userIndex].email);

        const userResponse = { ...users[userIndex] };
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Idea uploaded successfully!',
            user: userResponse,
            idea: newIdea
        });

    } catch (error) {
        console.error('❌ Upload idea error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== GET IDEAS FOR ENTREPRENEUR =====
app.get('/api/ideas/:entrepreneurId', (req, res) => {
    try {
        const { entrepreneurId } = req.params;
        
        const users = readUsers();
        const user = users.find(u => u.id === entrepreneurId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ideas = user.ideas || [];
        res.json({ 
            success: true, 
            ideas: ideas,
            count: ideas.length
        });

    } catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== DOWNLOAD POC REPORT =====
app.get('/api/download/poc/:entrepreneurId', (req, res) => {
    try {
        const { entrepreneurId } = req.params;
        const users = readUsers();
        const user = users.find(u => u.id === entrepreneurId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ideas = user.ideas || [];
        if (ideas.length === 0) {
            return res.status(404).json({ error: 'No ideas found' });
        }

        const lastIdea = ideas[ideas.length - 1];
        if (!lastIdea.pocReportPath) {
            return res.status(404).json({ error: 'POC Report not found' });
        }

        const filePath = path.join(__dirname, lastIdea.pocReportPath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        res.download(filePath, lastIdea.pocReportName);
    } catch (error) {
        console.error('Error downloading POC:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== DOWNLOAD BUSINESS PLAN =====
app.get('/api/download/business-plan/:entrepreneurId', (req, res) => {
    try {
        const { entrepreneurId } = req.params;
        const users = readUsers();
        const user = users.find(u => u.id === entrepreneurId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ideas = user.ideas || [];
        if (ideas.length === 0) {
            return res.status(404).json({ error: 'No ideas found' });
        }

        const lastIdea = ideas[ideas.length - 1];
        if (!lastIdea.businessPlanPath) {
            return res.status(404).json({ error: 'Business Plan not found' });
        }

        const filePath = path.join(__dirname, lastIdea.businessPlanPath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        res.download(filePath, lastIdea.businessPlanName);
    } catch (error) {
        console.error('Error downloading Business Plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        port: PORT,
        usersCount: readUsers().length
    });
});

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Artha Samridhi API Server is running!',
        version: '1.0.0',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            users: 'GET /api/users',
            user: 'GET /api/user/:id',
            advocates: 'GET /api/advocates',
            caGraduates: 'GET /api/ca-graduates',
            uploadIdea: 'POST /api/upload-idea',
            getIdeas: 'GET /api/ideas/:entrepreneurId',
            downloadPoc: 'GET /api/download/poc/:entrepreneurId',
            downloadBusinessPlan: 'GET /api/download/business-plan/:entrepreneurId',
            health: 'GET /api/health'
        }
    });
});

// ===== PASSWORD STRENGTH CHECKER =====
function checkPasswordStrength(password) {
    let score = 0;
    const checks = [];

    if (password.length >= 8) { score++; checks.push({ valid: true, text: 'At least 8 characters' }); } else { checks.push({ valid: false, text: 'At least 8 characters' }); }
    if (/[A-Z]/.test(password)) { score++; checks.push({ valid: true, text: 'Uppercase letter' }); } else { checks.push({ valid: false, text: 'Uppercase letter' }); }
    if (/[a-z]/.test(password)) { score++; checks.push({ valid: true, text: 'Lowercase letter' }); } else { checks.push({ valid: false, text: 'Lowercase letter' }); }
    if (/[0-9]/.test(password)) { score++; checks.push({ valid: true, text: 'Number' }); } else { checks.push({ valid: false, text: 'Number' }); }
    if (/[^A-Za-z0-9]/.test(password)) { score++; checks.push({ valid: true, text: 'Special character' }); } else { checks.push({ valid: false, text: 'Special character' }); }

    return {
        score: score,
        strength: score >= 4 ? 'Strong' : score >= 3 ? 'Good' : score >= 2 ? 'Weak' : 'Very Weak',
        checks: checks
    };
}

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Users data stored in: ${DATA_FILE}`);
    console.log(`📁 Uploads stored in: ${uploadDir}`);
    console.log(`\n🔗 API endpoints:`);
    console.log(`   - GET   /               (Root)`);
    console.log(`   - GET   /api/health     (Health check)`);
    console.log(`   - POST  /api/register   (Register user)`);
    console.log(`   - POST  /api/login      (Login user)`);
    console.log(`   - GET   /api/users      (Get all users)`);
    console.log(`   - GET   /api/user/:id   (Get user by ID)`);
    console.log(`   - GET   /api/advocates  (Get all advocates)`);
    console.log(`   - GET   /api/ca-graduates (Get all CA graduates)`);
    console.log(`   - POST  /api/upload-idea (Upload idea with files)`);
    console.log(`   - GET   /api/ideas/:id  (Get ideas for entrepreneur)`);
    console.log(`   - GET   /api/download/poc/:id (Download POC Report)`);
    console.log(`   - GET   /api/download/business-plan/:id (Download Business Plan)`);
    console.log(`\n✅ Press Ctrl+C to stop the server\n`);
});