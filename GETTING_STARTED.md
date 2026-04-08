# Getting Started

Korean Law MCP를 내 컴퓨터에 설치하고, Claude Desktop에서 한국 법령을 검색할 수 있도록 설정하는 가이드입니다.

전체 과정은 약 10분이면 끝납니다.

---

## 1단계: 사전 준비

### Node.js 설치

이 프로젝트를 실행하려면 **Node.js 20 이상**이 필요합니다.

**Mac/Linux:**

1. [https://nodejs.org](https://nodejs.org)에 접속합니다.
2. **LTS** 버전의 다운로드 버튼을 클릭합니다.
3. 다운로드된 설치 파일을 실행하고, 안내에 따라 설치를 완료합니다.

**Windows:**

cmd(명령 프롬프트)를 열고 아래 명령어를 입력합니다:

```cmd
winget install OpenJS.NodeJS.LTS
```

설치가 완료되면 **cmd를 닫았다가 다시 연 뒤** 아래 명령어로 확인합니다:

```bash
node -v
```

`v20.x.x` 이상의 숫자가 나오면 성공입니다.

### Git 설치

프로젝트 코드를 다운로드하려면 Git이 필요합니다.

- **Mac**: 터미널에 `git --version`을 입력하면 자동으로 설치를 안내합니다.
- **Linux**: `sudo apt install git` (Ubuntu/Debian) 또는 `sudo dnf install git` (Fedora)
- **Windows**: [https://git-scm.com](https://git-scm.com)에서 다운로드 후 설치합니다. 설치 시 기본 옵션 그대로 진행하면 됩니다.

### Claude Desktop 설치

아직 설치하지 않았다면 [https://claude.ai/download](https://claude.ai/download)에서 다운로드합니다.

---

## 2단계: 법제처 API 키 발급 (무료)

법령 데이터를 조회하려면 법제처에서 발급하는 **인증키(OC)**가 필요합니다. 무료입니다.

1. [법제처 Open API 신청 페이지](https://open.law.go.kr/LSO/openApi/guideList.do)에 접속합니다.
2. 회원가입 후 로그인합니다.
3. **"Open API 사용 신청"** 버튼을 누릅니다.
4. 신청서를 작성하면 **인증키(OC)**가 즉시 발급됩니다. (예: `honggildong`)

이 인증키를 메모해 두세요. 4단계에서 사용합니다.

---

## 3단계: 프로젝트 다운로드 및 빌드

터미널을 열고 아래 명령어를 **한 줄씩** 순서대로 입력합니다.

**Mac/Linux:**

```bash
git clone https://github.com/gejyn14/korean-law-mcp.git
cd korean-law-mcp
npm install
npm run build
```

**Windows (cmd):**

```cmd
git clone https://github.com/gejyn14/korean-law-mcp.git
cd korean-law-mcp
npm install
npm run build
```

마지막 명령어가 아무 에러 없이 끝나면 성공입니다.

> **참고**: 코드가 다운로드되는 위치는 터미널을 열었을 때의 현재 폴더입니다. Mac/Linux는 보통 홈 폴더(`~`), Windows는 `C:\Users\사용자이름`입니다. 원하는 위치가 있다면 `git clone` 전에 `cd 원하는경로`로 먼저 이동하세요.

---

## 4단계: Claude Desktop 설정

Claude Desktop에 이 MCP 서버를 연결합니다.

### 설정 파일 열기

| OS | 설정 파일 위치 |
|----|---------------|
| **Mac** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |

파일이 없으면 새로 만들면 됩니다.

**Mac에서 폴더 여는 법:**

```bash
open ~/Library/Application\ Support/Claude/
```

Finder에서 해당 폴더가 열립니다. `claude_desktop_config.json` 파일을 텍스트 편집기로 여세요. 파일이 없다면 이 이름으로 새로 만듭니다.

**Windows에서 폴더 여는 법:**

`Win + R`을 누르고 아래를 입력한 뒤 Enter:

```
%APPDATA%\Claude
```

탐색기에서 해당 폴더가 열립니다. `claude_desktop_config.json` 파일을 메모장으로 여세요. 파일이 없다면 이 이름으로 새로 만듭니다.

### 설정 내용 입력

파일에 아래 내용을 붙여넣으세요. **두 곳**을 본인 환경에 맞게 수정해야 합니다:

```json
{
  "mcpServers": {
    "korean-law": {
      "command": "node",
      "args": ["여기에_build/index.js_전체경로"],
      "env": {
        "LAW_OC": "여기에_본인_인증키"
      }
    }
  }
}
```

**수정할 곳:**

1. **`args`의 경로** — 3단계에서 다운로드한 `korean-law-mcp` 폴더 안의 `build/index.js` 전체 경로로 바꿉니다.

   경로를 모르겠다면 터미널에서 아래 명령어를 입력하세요:

   **Mac/Linux:**
   ```bash
   cd korean-law-mcp && pwd
   ```
   출력된 경로 뒤에 `/build/index.js`를 붙이면 됩니다.

   **Windows (cmd):**
   ```cmd
   cd korean-law-mcp && cd
   ```
   출력된 경로 뒤에 `\build\index.js`를 붙이면 됩니다.

2. **`LAW_OC`** — 2단계에서 발급받은 인증키로 바꿉니다.

### 완성 예시

**Mac/Linux:**

```json
{
  "mcpServers": {
    "korean-law": {
      "command": "node",
      "args": ["/Users/홍길동/korean-law-mcp/build/index.js"],
      "env": {
        "LAW_OC": "honggildong"
      }
    }
  }
}
```

**Windows:**

```json
{
  "mcpServers": {
    "korean-law": {
      "command": "node",
      "args": ["C:\\Users\\홍길동\\korean-law-mcp\\build\\index.js"],
      "env": {
        "LAW_OC": "honggildong"
      }
    }
  }
}
```

> **이미 다른 MCP 서버가 설정되어 있다면**, `"mcpServers": { ... }` 안에 `"korean-law": { ... }` 부분만 추가하세요. 기존 설정을 덮어쓰지 않도록 주의합니다.

### Claude Desktop 재시작

설정 파일을 저장한 뒤 Claude Desktop을 **완전히 종료**하고 다시 실행합니다.

---

## 5단계: 동작 확인

Claude Desktop 채팅창에 아래와 같이 입력해 보세요:

```
근로기준법 제1조 알려줘
```

법령 내용이 표시되면 설정 완료입니다.

다른 예시도 시도해 보세요:

```
민법 제750조 내용이 뭐야?
음주운전 처벌 기준 알려줘
산업안전보건법 최근 개정 내용 비교해줘
```

---

## 문제가 생겼다면

| 증상 | 해결 방법 |
|------|-----------|
| Claude에서 법령 도구가 안 보임 | 설정 파일의 JSON 문법이 맞는지 확인하세요. 쉼표, 따옴표, 중괄호를 체크합니다. |
| `node: command not found` | Node.js가 제대로 설치되지 않았습니다. 1단계를 다시 진행하세요. |
| `'node'은(는) 내부 또는 외부 명령...이 아닙니다` (Windows) | Node.js 설치 후 cmd를 닫았다가 다시 열어 보세요. |
| `'npm'은(는) 내부 또는 외부 명령...이 아닙니다` (Windows) | 위와 동일합니다. Node.js를 설치하면 npm도 함께 설치됩니다. cmd를 닫았다가 다시 열어 보세요. 그래도 안 되면 Node.js를 재설치하세요. |
| `Cannot find module` 에러 | 3단계의 `npm run build`가 정상 완료되었는지 확인하세요. |
| `args` 경로 에러 | 경로에 오타가 없는지, `build/index.js` 파일이 실제로 존재하는지 확인하세요. Windows는 경로 구분자를 `\\`로 써야 합니다. |
| API 응답 에러 | 인증키(LAW_OC)가 올바른지 확인하세요. |
