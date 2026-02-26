import { useEffect, useState } from "react";

export default function App() {
    const [status, setStatus] = useState<any>(null);
    const [videos, setVideos] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
    const [playlistItems, setPlaylistItems] = useState<any[]>([]);

    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [extTitle, setExtTitle] = useState<string>("");
    const [extUrl, setExtUrl] = useState<string>("");
    const [log, setLog] = useState<string>("");

    function logIt(x: any) {
        setLog(typeof x === "string" ? x : JSON.stringify(x, null, 2));
    }

    async function refreshVideos() {
        const r = await window.api.videos.list({ type: "all" });
        setVideos(r.items ?? []);
        logIt(r);
    }

    async function refreshPlaylists() {
        const r = await window.api.playlists.list();
        setPlaylists(r.items ?? []);
        logIt(r);
    }

    async function refreshPlaylistItems(pid: string) {
        if (!pid) {
            setPlaylistItems([]);
            return;
        }
        const r = await window.api.playlists.getlist({ playlistId: Number(pid) });
        setPlaylistItems(r.items ?? []);
        logIt(r);
    }

    useEffect(() => {
        (async () => {
            try {
                const s = await window.api.auth.status();
                setStatus(s);
                await refreshVideos();
                await refreshPlaylists();
            } catch (e) {
                logIt(String(e));
            }
        })();
    }, []);

    return (
        <div style={{ fontFamily: "sans-serif", padding: 16, display: "grid", gap: 16 }}>
            <h2>Video Hub  Desktop-only Test UI</h2>

            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <b>Auth status:</b>
                <pre style={{ marginTop: 8 }}>{JSON.stringify(status, null, 2)}</pre>
            </div>
            {/* ...rest of the component... */}
        </div>
    );
}
