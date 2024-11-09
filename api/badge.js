const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        const db = client.db('ecoweb');
        
        // lighthouse_traffic 컬렉션에서 데이터 조회
        const data = await db.collection('lighthouse_traffic').findOne({ 
            url: url,  // 정확한 URL 매칭
        });

        if (!data) {
            await client.close();
            return res.status(404).json({ error: 'URL not found' });
        }

        // resource_summary 배열의 첫 번째 항목에서 transferSize 가져오기
        const transferSize = data.resource_summary[0].transferSize;
        
        // KB로 변환하고 탄소 배출량 계산
        const kb_weight = transferSize / 1024;
        const carbon = Math.round((kb_weight * 0.04) / 272.51 * 1000) / 1000;
        
        // 임시 백분위 값
        const percentage = 1;

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