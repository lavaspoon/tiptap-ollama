import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import {
    Undo,
    Redo,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Bold,
    Italic,
    Strikethrough,
    Code,
    Underline as UnderlineIcon,
    Highlighter,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Sparkles,
    X,
    Check,
    ChevronRight,
    ChevronLeft,
    FileText,
    PenLine,
    Languages,
    MessageSquare,
    Send
} from 'lucide-react';
import './TiptapEditor.css';

const AICommandModal = ({ isOpen, onClose, selectedText, editor }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [currentCommand, setCurrentCommand] = useState(null);
    const [showAskAI, setShowAskAI] = useState(false);
    const [askAIInput, setAskAIInput] = useState('');

    if (!isOpen) return null;

    const handleCommand = async (command, customPrompt = null) => {
        setIsLoading(true);
        setCurrentCommand(command);

        try {
            // Ollama API 호출
            let prompt = '';

            if (customPrompt) {
                // 직접 질문하기
                prompt = `당신은 전문적인 AI 어시스턴트입니다. 다음 텍스트와 관련하여 사용자의 질문에 답변해주세요.

[요청사항]
- 반드시 한국어로 답변해주세요
- 명확하고 도움이 되는 답변을 제공하세요
- 텍스트의 맥락을 고려하여 답변하세요

[텍스트]
${selectedText}

[사용자 질문]
${customPrompt}

[답변]`;
            } else {
                switch(command) {
                    case 'summarize':
                        prompt = `당신은 전문적인 요약 작성자입니다. 다음 텍스트의 핵심 내용을 간결하고 명확하게 요약해주세요.

[요청사항]
- 반드시 한국어로 답변해주세요
- 원문의 핵심 메시지와 중요한 정보만 포함하세요
- 3-5문장 이내로 간결하게 작성하세요
- 불필요한 세부사항은 제외하세요

[원문]
${selectedText}

[요약]`;
                        break;

                    case 'continue':
                        prompt = `당신은 창의적인 글쓰기 전문가입니다. 다음 텍스트를 자연스럽게 이어서 작성해주세요.

[요청사항]
- 반드시 한국어로 답변해주세요
- 앞 내용의 맥락과 톤을 유지하세요
- 자연스럽고 논리적으로 이어지도록 작성하세요
- 2-3문단 정도로 작성해주세요

[기존 텍스트]
${selectedText}

[이어서 작성]`;
                        break;

                    case 'improve':
                        prompt = `당신은 전문 에디터입니다. 다음 텍스트를 더욱 명확하고 전문적으로 개선해주세요.

[요청사항]
- 반드시 한국어로 답변해주세요
- 문장 구조를 더 명확하게 만들어주세요
- 전문적이고 세련된 표현을 사용하세요
- 불필요한 반복을 제거하세요
- 가독성을 높여주세요
- 원문의 의미는 그대로 유지하세요

[원문]
${selectedText}

[개선된 텍스트]`;
                        break;

                    case 'translate':
                        prompt = `당신은 전문 번역가입니다. 다음 한국어 텍스트를 영어로 정확하게 번역해주세요.

[요청사항]
- 원문의 의미와 뉘앙스를 정확하게 전달하세요
- 자연스러운 영어 표현을 사용하세요
- 전문 용어는 적절한 영어 표현으로 번역하세요
- 번역문만 작성하고, 다른 설명은 추가하지 마세요

[한국어 원문]
${selectedText}

[영어 번역]`;
                        break;

                    default:
                        prompt = selectedText;
                }
            }

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3.1:8b',
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API 오류: ${response.status}`);
            }

            const data = await response.json();
            const result = data.response || '결과를 생성할 수 없습니다.';

            setAiResult(result.trim());
            setShowAskAI(false);
            setAskAIInput('');
        } catch (error) {
            console.error('AI 처리 중 오류:', error);
            setAiResult(`오류가 발생했습니다: ${error.message}\n\nOllama가 실행 중인지 확인해주세요.\n터미널에서 'ollama serve' 명령을 실행해보세요.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = () => {
        if (aiResult && editor) {
            // 선택된 텍스트를 AI 결과로 교체
            editor.chain().focus().insertContent(aiResult).run();
            handleClose();
        }
    };

    const handleReject = () => {
        setAiResult(null);
        setCurrentCommand(null);
    };

    const handleClose = () => {
        setAiResult(null);
        setCurrentCommand(null);
        setIsLoading(false);
        setShowAskAI(false);
        setAskAIInput('');
        onClose();
    };

    const handleAskAISubmit = (e) => {
        e.preventDefault();
        if (askAIInput.trim()) {
            handleCommand('ask', askAIInput);
        }
    };

    return (
        <div className="ai-modal-overlay" onClick={handleClose}>
            <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-header">
                    <div className="ai-modal-title">
                        <Sparkles size={20} className="ai-title-icon" />
                        <h3>AI 어시스턴트</h3>
                    </div>
                    <button className="ai-modal-close" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {!aiResult && !isLoading && !showAskAI && (
                    <div className="ai-modal-commands">
                        <button
                            className="ai-command-button"
                            onClick={() => handleCommand('summarize')}
                        >
                            <div className="ai-command-icon">
                                <FileText size={20} />
                            </div>
                            <div className="ai-command-info">
                                <div className="ai-command-title">요약하기</div>
                                <div className="ai-command-desc">핵심 내용을 간결하게</div>
                            </div>
                            <ChevronRight size={16} className="ai-command-arrow" />
                        </button>

                        <button
                            className="ai-command-button"
                            onClick={() => handleCommand('continue')}
                        >
                            <div className="ai-command-icon">
                                <PenLine size={20} />
                            </div>
                            <div className="ai-command-info">
                                <div className="ai-command-title">계속 작성하기</div>
                                <div className="ai-command-desc">자연스럽게 이어서</div>
                            </div>
                            <ChevronRight size={16} className="ai-command-arrow" />
                        </button>

                        <button
                            className="ai-command-button"
                            onClick={() => handleCommand('improve')}
                        >
                            <div className="ai-command-icon">
                                <Sparkles size={20} />
                            </div>
                            <div className="ai-command-info">
                                <div className="ai-command-title">개선하기</div>
                                <div className="ai-command-desc">더 명확하고 전문적으로</div>
                            </div>
                            <ChevronRight size={16} className="ai-command-arrow" />
                        </button>

                        <button
                            className="ai-command-button"
                            onClick={() => handleCommand('translate')}
                        >
                            <div className="ai-command-icon">
                                <Languages size={20} />
                            </div>
                            <div className="ai-command-info">
                                <div className="ai-command-title">번역하기</div>
                                <div className="ai-command-desc">한국어 → 영어</div>
                            </div>
                            <ChevronRight size={16} className="ai-command-arrow" />
                        </button>

                        <button
                            className="ai-command-button ai-command-ask"
                            onClick={() => setShowAskAI(true)}
                        >
                            <div className="ai-command-icon">
                                <MessageSquare size={20} />
                            </div>
                            <div className="ai-command-info">
                                <div className="ai-command-title">AI에게 질문하기</div>
                                <div className="ai-command-desc">자유롭게 물어보세요</div>
                            </div>
                            <ChevronRight size={16} className="ai-command-arrow" />
                        </button>
                    </div>
                )}

                {showAskAI && !isLoading && !aiResult && (
                    <div className="ai-ask-container">
                        <div className="ai-ask-header">
                            <button className="ai-back-button" onClick={() => setShowAskAI(false)}>
                                <ChevronLeft size={20} />
                            </button>
                            <span>AI에게 질문하기</span>
                        </div>
                        <form onSubmit={handleAskAISubmit} className="ai-ask-form">
              <textarea
                  className="ai-ask-input"
                  placeholder="선택한 텍스트에 대해 궁금한 점을 질문해보세요..."
                  value={askAIInput}
                  onChange={(e) => setAskAIInput(e.target.value)}
                  autoFocus
                  rows={6}
              />
                            <button
                                type="submit"
                                className="ai-ask-submit"
                                disabled={!askAIInput.trim()}
                            >
                                <Send size={18} />
                                질문하기
                            </button>
                        </form>
                    </div>
                )}

                {isLoading && (
                    <div className="ai-modal-loading">
                        <div className="loading-spinner"></div>
                        <p>AI가 처리 중입니다...</p>
                    </div>
                )}

                {aiResult && !isLoading && (
                    <div className="ai-result-container">
                        <div className="ai-result-header">
                            <Sparkles size={16} />
                            <strong>AI 결과</strong>
                        </div>
                        <div className="ai-result-content">
                            {aiResult}
                        </div>
                        <div className="ai-result-actions">
                            <button className="ai-action-reject" onClick={handleReject}>
                                <X size={18} />
                                취소
                            </button>
                            <button className="ai-action-accept" onClick={handleAccept}>
                                <Check size={18} />
                                적용하기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="menu-bar">
            <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="menu-button"
                title="실행 취소"
            >
                <Undo size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="menu-button"
                title="다시 실행"
            >
                <Redo size={18} />
            </button>

            <div className="divider"></div>

            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'menu-button is-active' : 'menu-button'}
                title="제목 1"
            >
                <Heading1 size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'menu-button is-active' : 'menu-button'}
                title="제목 2"
            >
                <Heading2 size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={editor.isActive('heading', { level: 3 }) ? 'menu-button is-active' : 'menu-button'}
                title="제목 3"
            >
                <Heading3 size={18} />
            </button>

            <div className="divider"></div>

            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'menu-button is-active' : 'menu-button'}
                title="글머리 기호 목록"
            >
                <List size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'menu-button is-active' : 'menu-button'}
                title="번호 매기기 목록"
            >
                <ListOrdered size={18} />
            </button>

            <div className="divider"></div>

            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'menu-button is-active' : 'menu-button'}
                title="굵게"
            >
                <Bold size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'menu-button is-active' : 'menu-button'}
                title="기울임"
            >
                <Italic size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive('strike') ? 'menu-button is-active' : 'menu-button'}
                title="취소선"
            >
                <Strikethrough size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={editor.isActive('code') ? 'menu-button is-active' : 'menu-button'}
                title="인라인 코드"
            >
                <Code size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={editor.isActive('underline') ? 'menu-button is-active' : 'menu-button'}
                title="밑줄"
            >
                <UnderlineIcon size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={editor.isActive('highlight') ? 'menu-button is-active' : 'menu-button'}
                title="형광펜"
            >
                <Highlighter size={18} />
            </button>

            <div className="divider"></div>

            <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={editor.isActive({ textAlign: 'left' }) ? 'menu-button is-active' : 'menu-button'}
                title="왼쪽 정렬"
            >
                <AlignLeft size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={editor.isActive({ textAlign: 'center' }) ? 'menu-button is-active' : 'menu-button'}
                title="가운데 정렬"
            >
                <AlignCenter size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={editor.isActive({ textAlign: 'right' }) ? 'menu-button is-active' : 'menu-button'}
                title="오른쪽 정렬"
            >
                <AlignRight size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={editor.isActive({ textAlign: 'justify' }) ? 'menu-button is-active' : 'menu-button'}
                title="양쪽 정렬"
            >
                <AlignJustify size={18} />
            </button>
        </div>
    );
};

const TiptapEditor = () => {
    const [showAIModal, setShowAIModal] = useState(false);
    const [selectedText, setSelectedText] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: `
      <p>
        텍스트를 <strong>선택</strong>하면 <em>Bubble Menu</em>가 나타납니다. 
        굵게, 기울임, 밑줄 등을 바로 적용할 수 있습니다.
      </p>
      <p>
        새로운 빈 줄을 추가하면 <strong>Floating Menu</strong>가 나타납니다. 
        제목이나 목록을 빠르게 선택할 수 있어요.
      </p>
      <p></p>
    `,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
            },
        },
    });

    return (
        <div className="tiptap-editor-container">
            <MenuBar editor={editor} />

            {editor && (
                <BubbleMenu
                    className="bubble-menu"
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    shouldShow={({ editor, view, state, oldState, from, to }) => {
                        // 텍스트가 실제로 선택되었을 때만 표시
                        return from !== to
                    }}
                >
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={editor.isActive('bold') ? 'is-active' : ''}
                        title="굵게"
                    >
                        <Bold size={18} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={editor.isActive('italic') ? 'is-active' : ''}
                        title="기울임"
                    >
                        <Italic size={18} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={editor.isActive('underline') ? 'is-active' : ''}
                        title="밑줄"
                    >
                        <UnderlineIcon size={18} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={editor.isActive('strike') ? 'is-active' : ''}
                        title="취소선"
                    >
                        <Strikethrough size={18} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        className={editor.isActive('highlight') ? 'is-active' : ''}
                        title="형광펜"
                    >
                        <Highlighter size={18} />
                    </button>
                    <div className="bubble-menu-divider"></div>
                    <button
                        onClick={() => {
                            const { from, to } = editor.state.selection;
                            const text = editor.state.doc.textBetween(from, to, ' ');
                            setSelectedText(text);
                            setShowAIModal(true);
                        }}
                        className="ai-button"
                        title="AI에게 물어보기"
                    >
                        <Sparkles size={16} className="ai-icon" /> AI
                    </button>
                </BubbleMenu>
            )}

            <EditorContent editor={editor} className="editor-content" />

            <AICommandModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                selectedText={selectedText}
                editor={editor}
            />
        </div>
    );
};

export default TiptapEditor;