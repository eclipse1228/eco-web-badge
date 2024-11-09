const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;


async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI, {
        maxPoolSize: 1,
        serverSelectionTimeoutMS: 5000
    });
    
    const db = client.db('ecoweb');
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const { db } = await connectToDatabase();
        
        // 데이터 조회 최적화
        const data = await db.collection('lighthouse_resource')
            .findOne({ url }, { projection: { total_byte_weight: 1 } });
            
        if (!data) {
            return res.status(404).json({ error: 'URL not found' });
        }

        // 탄소 배출량 계산
        const kb_weight = data.total_byte_weight / 1024;
        const carbon = Math.round((kb_weight * 0.04) / 272.51 * 1000) / 1000;
        
        // 백분위 계산 최적화
        const betterThanCount = await db.collection('lighthouse_resource')
            .countDocuments({ total_byte_weight: { $gt: data.total_byte_weight } });
        const totalCount = await db.collection('lighthouse_resource').countDocuments();
        const percentage = Math.round((betterThanCount / totalCount) * 100);

        res.json({
            carbon,
            percentage
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};