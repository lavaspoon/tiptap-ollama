/**
 * 텍스트 정규화 - 공백을 단일 공백으로 변환
 */
export const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();

/**
 * 문장부호 목록
 */
const PUNCTUATION_MARKS = ['.', '!', '?', ',', ';', ':', '…', '\n', '\r\n'];

/**
 * Tiptap 문서에서 텍스트를 찾는 4단계 전략
 * @param {Object} doc - Tiptap 문서 객체
 * @param {string} searchText - 찾을 텍스트
 * @returns {Object|null} { searchText, index, finalSuggestion } 또는 null
 */
export const findTextInDocument = (doc, originalText, suggestionText = null) => {
    const fullText = doc.textContent;
    let searchText = originalText;
    let finalSuggestion = suggestionText;
    let index = -1;

    // 전략 1: 정확히 일치하는 텍스트 찾기
    index = fullText.indexOf(searchText);

    // 전략 2: 공백 정규화 후 찾기
    if (index === -1) {
        const normalizedOriginal = normalizeText(searchText);
        const normalizedFullText = normalizeText(fullText);
        const normalizedIndex = normalizedFullText.indexOf(normalizedOriginal);

        if (normalizedIndex !== -1) {
            for (let i = 0; i < fullText.length; i++) {
                if (normalizeText(fullText.substring(0, i + 1)).length === normalizedIndex + normalizedOriginal.length) {
                    searchText = fullText.substring(i - normalizedOriginal.length + 1, i + 1);
                    index = i - normalizedOriginal.length + 1;
                    break;
                }
            }
        }
    }

    // 전략 3: 문장부호를 포함해서 찾기
    if (index === -1 && !searchText.match(/[.!?,;:…\n\r\t]$/)) {
        for (const mark of PUNCTUATION_MARKS) {
            const textWithPunctuation = searchText + mark;
            const foundIndex = fullText.indexOf(textWithPunctuation);
            if (foundIndex !== -1) {
                searchText = textWithPunctuation;
                index = foundIndex;

                if (finalSuggestion && !finalSuggestion.endsWith(mark)) {
                    finalSuggestion = finalSuggestion + mark;
                }
                break;
            }
        }
    }

    // 전략 4: 앞뒤 공백 제거 후 찾기
    if (index === -1) {
        const trimmedSearch = searchText.trim();
        index = fullText.indexOf(trimmedSearch);
        if (index !== -1) {
            searchText = trimmedSearch;
        }
    }

    if (index === -1) {
        return null;
    }

    return { searchText, index, finalSuggestion };
};

/**
 * Tiptap 문서에서 텍스트의 실제 위치(position)를 찾기
 * @param {Object} doc - Tiptap 문서 객체
 * @param {number} index - textContent에서의 인덱스
 * @param {number} length - 텍스트 길이
 * @returns {Object|null} { from, to } 또는 null
 */
export const getTextPosition = (doc, index, length) => {
    let fromPos = 0;
    let toPos = 0;
    let found = false;
    let currentPos = 0;

    doc.descendants((node, pos) => {
        if (!found && node.isText) {
            const nodeText = node.text;
            const relativeIndex = index - currentPos;

            if (relativeIndex >= 0 && relativeIndex < nodeText.length) {
                fromPos = pos + relativeIndex;
                toPos = fromPos + length;
                found = true;
                return false;
            }

            currentPos += nodeText.length;
        }
    });

    return found ? { from: fromPos, to: toPos } : null;
};