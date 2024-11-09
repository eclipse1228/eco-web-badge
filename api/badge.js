const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        // MongoDB 연결
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        const db = client.db('ecoweb');  // MongoDB Atlas의 데이터베이스 이름
        
        // 데이터 조회
        const data = await db.collection('lighthouse_resource').findOne({ url });
        if (!data) {
            return res.status(404).json({ error: 'URL not found' });
        }

        // 탄소 배출량 계산
        const kb_weight = data.total_byte_weight / 1024;
        const carbon = Math.round((kb_weight * 0.04) / 272.51 * 1000) / 1000;
        
        // 백분위 계산
        const all_sites = await db.collection('lighthouse_resource').find().toArray();
        const better_than = all_sites.filter(
            site => site.total_byte_weight > data.total_byte_weight
        ).length;
        const percentage = Math.round((better_than / all_sites.length) * 100);

        await client.close();

        res.json({
            carbon,
            percentage
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};