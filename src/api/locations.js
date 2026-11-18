const BASE = '/api/locations';

async function readError(res) {
    try {
        const data = await res.json();
        return data.error || 'Something went wrong';
    } catch {
        return 'Something went wrong';
    }
}

export async function createLocation(name, parentId = null) {
    const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
    });
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
}

export async function updateLocation(id, changes) {
    const res = await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
    });
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
}

export async function deleteLocation(id) {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res));
    // On success the server sends 204 (no body), so there is nothing to read.
}

