
async function extractWhatsApp() {
    console.log('═'.repeat(30));
    console.log('🤖 EXTRACTOR WHATSAPP WEB: INCREMENTAL SCROLL');
    console.log('═'.repeat(30));
    console.log('🔍 Searching container...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    let container = null;
    const allDivs = document.querySelectorAll('div');

    for (const div of allDivs) {
        const style = window.getComputedStyle(div);
        const msgsInside = div.querySelectorAll('[data-id]').length;
        if (msgsInside > 5) {
            const hasScroll = (style.overflowY === 'auto' || style.overflowY === 'scroll');
            const canScroll = div.scrollHeight > div.clientHeight;
            if (hasScroll && canScroll) {
                container = div;
                console.log('✅ Container found with ' + msgsInside + ' visible messages');
                break;
            }
        }
    }

    if (!container) {
        console.error('❌ No scrolleable container found');
        return;
    }

    console.log('📊 Total height: ' + container.scrollHeight + 'px');
    console.log('⬇️ Starting extraction with incremental scroll...');
    console.log('');

    const allMessages = new Map();
    let previousCount = 0;
    let noNewCount = 0;
    let scrollStep = 0;
    const maxNoNew = 15;

    while (noNewCount < maxNoNew) {
        // Extract current messages in the DOM
        const currentElements = document.querySelectorAll('[data-id]');

        currentElements.forEach(el => {
            const dataId = el.getAttribute('data-id');

            if (!allMessages.has(dataId)) {
                try {
                    let author = 'Desconocido', ts = '', text = '', type = 'text';

                    const authEl = el.querySelector('[data-pre-plain-text]');
                    if (authEl) {
                        const pre = authEl.getAttribute('data-pre-plain-text');
                        const m = pre.match(/\[(.*?)\]\s+(.*?):/);
                        if (m) {
                            ts = m[1];
                            author = m[2].trim();
                        }
                    }

                    const txtEl = el.querySelector('span.selectable-text');
                    if (txtEl) {
                        text = txtEl.innerText.trim();
                    }

                    if (el.querySelector('[data-testid="audio-play"]')) {
                        type = 'audio';
                    } else if (el.querySelector('img[src*="blob"]')) {
                        type = 'image';
                    } else if (el.querySelector('[data-testid="media-document"]')) {
                        type = 'document';
                    }

                    if (type !== 'text' && !text) {
                        text = '[' + type.toUpperCase() + ']';
                    }

                    if (text) {
                        allMessages.set(dataId, {
                            dataId: dataId,
                            timestamp: ts,
                            author: author,
                            text: text,
                            type: type
                        });
                    }
                } catch (e) {}
            }
        });

        const currentCount = allMessages.size;
        const newMessages = currentCount - previousCount;

        if (newMessages === 0) {
            noNewCount++;
        } else {
            noNewCount = 0;
            previousCount = currentCount;
        }

        scrollStep++;

        if (scrollStep % 5 === 0 || newMessages > 0) {
            console.log('📜 Paso ' + scrollStep + ' | Total extraídos: ' + currentCount + (newMessages > 0 ? ' (+' + newMessages + ')' : '') + ' | SinNuevos: ' + noNewCount + '/' + maxNoNew);
        }

        const oldScroll = container.scrollTop;
        const scrollAmount = container.clientHeight * 0.7; // Scroll 70% de la altura visible

        try {
            container.scrollTop += scrollAmount;
            container.scrollTo({top: container.scrollTop + scrollAmount, behavior: 'smooth'});
        } catch (e) {}

        await new Promise(resolve => setTimeout(resolve, 1500));

        if (container.scrollTop >= container.scrollHeight - container.clientHeight - 100) {
            console.log('✅ Llegamos al final del chat');

            const finalElements = document.querySelectorAll('[data-id]');
            finalElements.forEach(el => {
                const dataId = el.getAttribute('data-id');
                if (!allMessages.has(dataId)) {
                    try {
                        let author = 'Desconocido', ts = '', text = '', type = 'text';

                        const authEl = el.querySelector('[data-pre-plain-text]');
                        if (authEl) {
                            const pre = authEl.getAttribute('data-pre-plain-text');
                            const m = pre.match(/\[(.*?)\]\s+(.*?):/);
                            if (m) {
                                ts = m[1];
                                author = m[2].trim();
                            }
                        }

                        const txtEl = el.querySelector('span.selectable-text');
                        if (txtEl) {
                            text = txtEl.innerText.trim();
                        }

                        if (el.querySelector('[data-testid="audio-play"]')) {
                            type = 'audio';
                        } else if (el.querySelector('img[src*="blob"]')) {
                            type = 'image';
                        } else if (el.querySelector('[data-testid="media-document"]')) {
                            type = 'document';
                        }

                        if (type !== 'text' && !text) {
                            text = '[' + type.toUpperCase() + ']';
                        }

                        if (text) {
                            allMessages.set(dataId, {
                                dataId: dataId,
                                timestamp: ts,
                                author: author,
                                text: text,
                                type: type
                            });
                        }
                    } catch (e) {}
                }
            });

            break;
        }
    }

    console.log('');
    console.log('═'.repeat(30));
    console.log('✅ EXTRACCIÓN COMPLETADA');
    console.log('═'.repeat(30));

    const msgs = Array.from(allMessages.values());

    msgs.forEach((m, i) => {
        m.id = i + 1;
    });

    const authors = [...new Set(msgs.map(m => m.author))];

    console.log('📊 Stats:');
    console.log('   • Total unique messages: ' + msgs.length);
    console.log('   • Unique authors: ' + authors.length);
    console.log('   • Scroll steps: ' + scrollStep);

    if (msgs.length > 0) {
        console.log('');
        console.log('📅 Time range:');
        console.log('   • First message: ' + msgs[0].timestamp + ' (' + msgs[0].author + ')');
        console.log('   • Last message: ' + msgs[msgs.length - 1].timestamp + ' (' + msgs[msgs.length - 1].author + ')');
    }

    console.log('');
    console.log('💾 Downloading files...');

    // Crear archivo TXT
    let txt = 'WHATSAPP EXPORT\n';
    txt += '═'.repeat(30) + '\n';
    txt += 'Fecha exportación: ' + new Date().toLocaleString() + '\n';
    txt += 'Total mensajes: ' + msgs.length + '\n';
    txt += 'Autores únicos: ' + authors.length + '\n';
    txt += '═'.repeat(30) + '\n\n';

    msgs.forEach(m => {
        txt += '[' + m.timestamp + '] ' + m.author + ':\n';
        txt += m.text + '\n\n';
    });

    const txtBlob = new Blob([txt], {type: 'text/plain;charset=utf-8'});
    const txtUrl = URL.createObjectURL(txtBlob);
    const txtLink = document.createElement('a');
    txtLink.href = txtUrl;
    txtLink.download = 'whatsapp_' + Date.now() + '.txt';
    txtLink.click();

    const json = {
        exported: new Date().toISOString(),
        total: msgs.length,
        authors: authors,
        messages: msgs
    };

    const jsonBlob = new Blob([JSON.stringify(json, null, 2)], {type: 'application/json'});
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = 'whatsapp_' + Date.now() + '.json';
    jsonLink.click();

    console.log('✅ Download completed!');
    console.log('═'.repeat(30));

    return msgs;
}

console.clear();
console.log('═'.repeat(30));
console.log('🤖 WHATSAPP WEB EXTRACTOR: INCREMENTAL SCROLL ||  EXTRACTOR WHATSAPP WEB: SCROLL INCREMENTAL');
console.log('═'.repeat(30));
console.log('⚠️  IMPORTANT || IMPORTANTE:');
console.log('   1. Scroll ALL THE WAY UP the chat (first message) ||Desplázate HASTA ARRIBA del chat (primer mensaje)');
console.log('   2. The script will scroll down and capture EVERYTHING || El script hará scroll hacia abajo y capturará TODO');
console.log('');
console.log('⏳ Executing in 3 seconds... || Ejecutando en 3 segundos...');
console.log('═'.repeat(30));

setTimeout(() => { extractWhatsApp(); }, 3000);
