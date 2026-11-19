// 상세페이지 자동 생성기 - 로컬 서버
// 실행: node --env-file=.env server.js  (Node.js 18 이상)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-haiku-5-5';

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function buildPrompt(i) {
  return `너는 한국 쇼핑몰 상세페이지 문구 작성자다. 아래 상품 정보로 문구를 만들어라.
규칙:
- 과장 표현을 쓰지 않는다: 최고, 100%, 완치, 무조건, 세계 1위, 부작용 없음, 즉시 효과, 영구.
- 입력에 없는 사실(소재, 효능, 인증)을 만들지 않는다.
- 결과는 JSON 객체 하나만 출력한다. 다른 설명은 쓰지 않는다.
JSON 형식:
{"headline": "짧은 헤드라인 (25자 이내)", "tagline": "한 줄 소개 (40자 이내)", "features": ["핵심 포인트 최대 5개, 각 40자 이내"], "usage": ["사용 방법 단계 최대 4개"]}

컨셉: ${{ calm: '감성 미니멀, 차분하고 따뜻한 톤', info: '정보형, 사양과 포인트를 명확하게', bold: '강조형, 짧고 힘 있는 문장' }[i.concept] || '감성 미니멀'}
컨셉 키워드: ${i.keywords || '없음'} (문구 전체에 이 방향이 드러나게 쓴다)

상품 정보:
상품명: ${i.name || ''}
핵심 특징 메모: ${i.memo || ''}
추천 대상: ${i.target || ''}
사양: ${i.specs || ''}`;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }

  if (req.method === 'POST' && req.url === '/api/copy') {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 200000) req.destroy();
    });
    req.on('end', async () => {
      try {
        if (!KEY) throw new Error('.env 파일에 ANTHROPIC_API_KEY가 없습니다.');
        const input = JSON.parse(body || '{}');
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 800,
            messages: [{ role: 'user', content: buildPrompt(input) }]
          })
        });
        const data = await r.json();
        if (!r.ok) throw new Error((data.error && data.error.message) || 'API 호출 실패');
        const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        send(res, 200, json);
      } catch (err) {
        send(res, 500, { error: err.message });
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log('실행 중: http://localhost:' + PORT));
