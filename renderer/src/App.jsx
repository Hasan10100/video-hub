import { useEffect, useState } from "react";

export default function App() {
    const [result, setResult] = useState("");

    useEffect(() => {
        console.log("window.api:", window.api);
    }, []);

    async function testAuthStatus() {
        try {
            const r = await window.api.auth.status?.();
            setResult(JSON.stringify(r, null, 2));
        } catch (err) {
            setResult(String(err));
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Video Hub React Renderer</h2>
            <button onClick={testAuthStatus}>Test Backend Connection</button>
            <pre>{result}</pre>
        </div>
    );
}
