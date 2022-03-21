import excuteQuery from '../../../../lib/dB';

export default async function handler(req, res) {
    if (req.method === "POST") {
        try {
            var pixelList = req.body.arguments[0];
            for(var i = 0; i < pixelList.length; i++) {
                var result = await excuteQuery({
                    query: `
                        UPDATE pixels
                        SET color_hex = ?, metadata_string = ?
                        WHERE id = ?
                    `,
                    values: [pixelList[i][1], pixelList[i][2], pixelList[i][0]]
                });
            }

            res.status(200).json({ success: true, msg: true });

        } catch (e) {
            res.status(500).json({ success: false, msg: e });
        }
    }
}
