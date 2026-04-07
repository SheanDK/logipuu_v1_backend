
const pool = require('./src/config/db').default;
async function checkColumns() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'");
        console.log("Columns:", res.rows.map(r => r.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkColumns();
