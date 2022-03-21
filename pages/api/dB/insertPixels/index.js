import excuteQuery from '../../../../lib/dB';

export default async function handler(req, res) {
    if (req.method === "POST") {
        try {
            var pixelList = req.body.arguments[0];
            for(var i = 0; i < pixelList.length; i++) {
                const result = await excuteQuery({
                    query: `
                        INSERT INTO pixels (id, collection_id, color_hex, metadata_string)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            collection_id = ?,
                            color_hex = ?,
                            metadata_string = ?
                    `,
                    values: [pixelList[i][0], pixelList[i][1], pixelList[i][2], pixelList[i][3], pixelList[i][1], pixelList[i][2], pixelList[i][3]]
                });
            }

            res.status(200).json({ success: true, msg: true });

        } catch (e) {
            res.status(500).json({ success: false, msg: e });
        }
    }
}
