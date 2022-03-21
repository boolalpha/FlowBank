import excuteQuery from '../../../../lib/dB';

export default async function handler(req, res) {
    if (req.method === "POST") {
        try {
            const result = await excuteQuery({
                query: `
                    SELECT COUNT(DISTINCT(collection_id)) as amountOwners
                    FROM pixels
                `,
                values: []
            });

            res.status(200).json({ success: true, msg: result });

        } catch (e) {
            res.status(500).json({ success: false, msg: e });
        }
    }
}
