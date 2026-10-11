import { z } from 'zod';
export function createFitnessService(settings, identity) {
    const config = () => settings;
    const json = (v, status = 200) => Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
    const schema = z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v))), week: z.number().int().min(1).max(26), done: z.record(z.string().regex(/^(?:[1-9]|1\d|2[0-6])-[0-6]$/), z.boolean()), notes: z.record(z.string().regex(/^(?:[1-9]|1\d|2[0-6])$/), z.string().max(10000)), profile: z.string().max(10000), checks: z.record(z.string().regex(/^[0-6]$/), z.boolean()), winter: z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v))), week: z.number().int().min(1).max(12), diet: z.enum(["veg", "vegan", "eggs", "mixed"]), done: z.record(z.string().regex(/^(?:[1-9]|1[0-2])-[0-6]$/), z.boolean()), notes: z.record(z.string().regex(/^(?:[1-9]|1[0-2])$/), z.string().max(3000)) }).strict().optional() }).strict();
    const b64 = (b) => btoa(String.fromCharCode(...b));
    const bytes = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    async function crypt(value, decrypt = false) { const c = config(); const key = await crypto.subtle.importKey('raw', bytes(c.TOKEN_ENCRYPTION_KEY), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); if (decrypt) {
        const [iv, data] = value.split('.');
        return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv) }, key, bytes(data)));
    } const iv = crypto.getRandomValues(new Uint8Array(12)); return b64(iv) + '.' + b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)))); }
    async function tokenRequest(fields) { const c = config(); const r = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...fields, client_id: c.WHOOP_CLIENT_ID, client_secret: c.WHOOP_CLIENT_SECRET }), signal: AbortSignal.timeout(15000) }); if (!r.ok)
        throw Error('WHOOP authorization expired or failed. Reconnect WHOOP.'); const t = await r.json(); if (!t.access_token || !t.refresh_token)
        throw Error('WHOOP did not return the required tokens. Reconnect with all requested scopes.'); return { ...t, expires_at: Date.now() + t.expires_in * 1000 }; }
    async function access(row, user) { let t = JSON.parse(await crypt(row.tokens, true)); if (t.expires_at < Date.now() + 60000) {
        t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token, scope: 'offline' });
        await config().DB.prepare('UPDATE fitness_whoop SET tokens=? WHERE user_id=?').bind(await crypt(JSON.stringify(t)), user).run();
    } return t.access_token; }
    async function handle(req) {
        const c = config(), db = c.DB, user = identity;
        if (!user)
            return json({ error: 'Sign in to your fitness account to continue.' }, 401);
        const u = new URL(req.url), path = u.pathname.replace('/api/fitness/', '');
        if (req.method !== 'GET' && req.headers.get('origin') !== c.SITE_ORIGIN)
            return json({ error: 'Invalid request origin.' }, 403);
        if (path === 'progress') {
            if (req.method === 'GET') {
                const row = await db.prepare('SELECT data,version FROM fitness_progress WHERE user_id=?').bind(user).first();
                return json(row ? { state: JSON.parse(row.data), version: row.version } : { state: null, version: 0 });
            }
            if (req.method === 'DELETE') {
                await db.prepare('DELETE FROM fitness_progress WHERE user_id=?').bind(user).run();
                return json({ ok: true });
            }
            if (req.method === 'PUT') {
                const text = await req.text();
                if (text.length > 100000)
                    return json({ error: 'Progress is too large.' }, 413);
                let body;
                try {
                    body = JSON.parse(text);
                }
                catch {
                    return json({ error: 'Invalid JSON.' }, 400);
                }
                const parsed = schema.safeParse(body.state);
                if (!parsed.success || !Number.isInteger(body.version) || body.version < 0)
                    return json({ error: 'Invalid progress format.' }, 400);
                const data = JSON.stringify(parsed.data);
                let result;
                if (body.version === 0)
                    result = await db.prepare('INSERT INTO fitness_progress(user_id,data,version) VALUES(?,?,1) ON CONFLICT(user_id) DO NOTHING').bind(user, data).run();
                else
                    result = await db.prepare('UPDATE fitness_progress SET data=?,version=version+1 WHERE user_id=? AND version=?').bind(data, user, body.version).run();
                if (!result.meta.changes)
                    return json({ error: 'Another device changed this plan. Export unsaved progress, then reload before editing.' }, 409);
                return json({ version: body.version + 1 });
            }
        }
        const configured = !!(c.WHOOP_CLIENT_ID && c.WHOOP_CLIENT_SECRET && c.TOKEN_ENCRYPTION_KEY && (()=>{try{return bytes(c.TOKEN_ENCRYPTION_KEY).length===32}catch{return false}})());
        if (path === 'whoop/status' && req.method === 'GET') {
            const r = await db.prepare('SELECT snapshot,synced_at FROM fitness_whoop WHERE user_id=?').bind(user).first();
            return json({ configured, connected: !!r, syncedAt: r?.synced_at ?? null, snapshot: r?.snapshot ? JSON.parse(r.snapshot) : null, redirectUri: c.SITE_ORIGIN + '/api/fitness/whoop/callback' });
        }
        if (path === 'whoop/connect' && req.method === 'POST') {
            if (!configured)
                return json({ error: 'WHOOP developer app credentials have not been configured.' }, 503);
            const state = b64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_');
            const nonce = b64(crypto.getRandomValues(new Uint8Array(32)));
            await db.prepare('DELETE FROM fitness_oauth_state WHERE user_id=? OR expires<?').bind(user, Date.now()).run();
            await db.prepare('INSERT INTO fitness_oauth_state(state,user_id,nonce,expires) VALUES(?,?,?,?)').bind(state, user, nonce, Date.now() + 600000).run();
            const url = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
            url.search = new URLSearchParams({ client_id: c.WHOOP_CLIENT_ID, response_type: 'code', redirect_uri: c.SITE_ORIGIN + '/api/fitness/whoop/callback', scope: 'offline read:recovery read:sleep read:cycles read:workout', state }).toString();
            const response = json({ url: url.toString() });
            response.headers.set('Set-Cookie', `whoop_nonce=${encodeURIComponent(nonce)}; HttpOnly; Secure; SameSite=Lax; Path=/api/fitness/whoop; Max-Age=600`);
            return response;
        }
        if (path === 'whoop/callback' && req.method === 'GET') {
            const fail = () => Response.redirect(c.SITE_ORIGIN + '/personalfitgoals?whoop=failed#whoop', 303);
            if (!configured)
                return fail();
            const state = u.searchParams.get('state'), code = u.searchParams.get('code');
            const nonce = decodeURIComponent((req.headers.get('cookie') || '').split('; ').find(x => x.startsWith('whoop_nonce='))?.slice(12) || '');
            if (!state || !code || !nonce)
                return fail();
            const row = await db.prepare('DELETE FROM fitness_oauth_state WHERE state=? AND user_id=? AND nonce=? AND expires>? RETURNING state').bind(state, user, nonce, Date.now()).first();
            if (!row)
                return fail();
            try {
                const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: c.SITE_ORIGIN + '/api/fitness/whoop/callback' });
                await db.prepare('INSERT INTO fitness_whoop(user_id,tokens) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET tokens=excluded.tokens,snapshot=NULL,synced_at=NULL').bind(user, await crypt(JSON.stringify(t))).run();
                const res = new Response(null, { status: 303, headers: { Location: c.SITE_ORIGIN + '/personalfitgoals?whoop=connected#whoop', 'Set-Cookie': 'whoop_nonce=; HttpOnly; Secure; SameSite=Lax; Path=/api/fitness/whoop; Max-Age=0' } });
                return res;
            }
            catch {
                return fail();
            }
        }
        if ((path === 'whoop/sync' || path === 'whoop/disconnect') && req.method === 'POST') {
            if (!configured)
                return json({ error: 'WHOOP is not configured yet.' }, 503);
            const lock = await db.prepare('UPDATE fitness_whoop SET lock_until=? WHERE user_id=? AND lock_until<? RETURNING *').bind(Date.now() + 120000, user, Date.now()).first();
            if (!lock)
                return json({ error: 'WHOOP is disconnected or another sync is running. Try again shortly.' }, 409);
            try {
                const token = await access(lock, user);
                if (path.endsWith('disconnect')) {
                    const r = await fetch('https://api.prod.whoop.com/developer/v2/user/access', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) });
                    if (!r.ok && r.status !== 401)
                        throw Error('WHOOP could not revoke access. Try again.');
                    await db.prepare('DELETE FROM fitness_whoop WHERE user_id=?').bind(user).run();
                    return json({ ok: true });
                }
                const result = {};
                for (const [name, endpoint] of [['recovery', 'recovery'], ['sleep', 'activity/sleep'], ['cycles', 'cycle'], ['workouts', 'activity/workout']]) {
                    const r = await fetch('https://api.prod.whoop.com/developer/v2/' + endpoint + '?limit=10', { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) });
                    if (!r.ok)
                        throw Error(r.status === 429 ? 'WHOOP rate limit reached. Try later.' : 'WHOOP data request failed. Try again or reconnect.');
                    const data = await r.json();
                    result[name] = Array.isArray(data.records) ? data.records : [];
                }
                const syncedAt = new Date().toISOString();
                await db.prepare('UPDATE fitness_whoop SET snapshot=?,synced_at=? WHERE user_id=?').bind(JSON.stringify(result), syncedAt, user).run();
                return json({ snapshot: result, syncedAt });
            }
            catch (e) {
                return json({ error: e instanceof Error ? e.message : 'WHOOP sync failed.' }, 502);
            }
            finally {
                await db.prepare('UPDATE fitness_whoop SET lock_until=0 WHERE user_id=?').bind(user).run();
            }
        }
        return json({ error: 'Not found.' }, 404);
    }
    async function safe(req) { try {
        return await handle(req);
    }
    catch {
        return json({ error: 'The service is temporarily unavailable. Your browser changes have not been saved to the server; retry shortly.' }, 503);
    } }
    return safe;
}
