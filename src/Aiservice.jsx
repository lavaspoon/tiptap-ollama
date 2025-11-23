import prompts from './Prompts.json';

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3.1:8b';

/**
 * 프롬프트 빌더
 */
const buildPrompt = (config, text, customPrompt = null) => {
    if (customPrompt) {
        return `${config.systemRole} ${config.task}

[요청사항]
${config.rules.map(rule => `- ${rule}`).join('\n')}

[텍스트]
${text}

[사용자 질문]
${customPrompt}

[답변]`;
    }

    const sections = [
        config.systemRole,
        config.task,
        '',
        '[반드시 지켜야 할 규칙]',
        ...config.rules.map((rule, idx) => `${idx + 1}. ${rule}`),
        '',
        '[텍스트]',
        text
    ];

    if (config.responseFormat) {
        sections.push(
            '',
            '[응답 형식]',
            JSON.stringify(config.responseFormat.example, null, 2),
            '',
            '위 형식의 JSON 배열만 출력하세요:'
        );
    }

    return sections.join('\n');
};

/**
 * Ollama API 호출
 */
export const callOllamaAPI = async (prompt, options = {}) => {
    const response = await fetch(OLLAMA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            prompt,
            stream: false,
            options: {
                temperature: options.temperature || 0.7,
                top_p: options.top_p || 0.9,
                max_tokens: options.max_tokens
            }
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '결과를 생성할 수 없습니다.';
};

/**
 * 맞춤법 검사
 */
export const analyzeSpelling = async (text) => {
    const config = prompts.spellCheck;
    const prompt = buildPrompt(config, text);

    try {
        const result = await callOllamaAPI(prompt, {
            temperature: config.temperature,
            top_p: config.top_p,
            max_tokens: config.max_tokens
        });

        // JSON 추출
        const jsonMatch = result.trim().match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        const suggestions = JSON.parse(jsonMatch[0]);
        return suggestions.filter(s =>
            s.original && s.suggestion && s.original !== s.suggestion
        ).slice(0, 3);
    } catch (error) {
        console.error('맞춤법 분석 오류:', error);
        return [];
    }
};

/**
 * AI 커맨드 실행
 */
export const executeAICommand = async (command, text, customPrompt = null) => {
    const config = customPrompt
        ? prompts.commands.ask
        : prompts.commands[command];

    if (!config) {
        throw new Error(`알 수 없는 커맨드: ${command}`);
    }

    const prompt = buildPrompt(config, text, customPrompt);

    try {
        const result = await callOllamaAPI(prompt, {
            temperature: config.temperature,
            top_p: config.top_p
        });

        return result.trim();
    } catch (error) {
        throw new Error(`AI 처리 중 오류: ${error.message}\n\nOllama가 실행 중인지 확인해주세요.`);
    }
};