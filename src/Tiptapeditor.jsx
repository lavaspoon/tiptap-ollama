import React, { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import {
    Undo, Redo, Heading1, Heading2, Heading3, List, ListOrdered,
    Bold, Italic, Strikethrough, Code, Underline as UnderlineIcon,
    Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Sparkles, X, Check, ChevronRight, ChevronLeft, FileText,
    PenLine, Languages, MessageSquare, Send
} from 'lucide-react';
import { analyzeSpelling, executeAICommand } from './Aiservice';
import { findTextInDocument, getTextPosition } from './Textutils';
import './TiptapEditor.css';

// AI 커맨드 모달 컴포넌트
const AICommandModal = ({ isOpen, onClose, selectedText, editor }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [showAskAI, setShowAskAI] = useState(false);
    const [askAIInput, setAskAIInput] = useState('');

    if (!isOpen) return null;

    const handleCommand = async (command, customPrompt = null) => {
        setIsLoading(true);
        try {
            const result = await executeAICommand(command, selectedText, customPrompt);
            setAiResult(result);
            setShowAskAI(false);
            setAskAIInput('');
        } catch (error) {
            setAiResult(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = () => {
        if (aiResult && editor) {
            editor.chain().focus().insertContent(aiResult).run();
            handleClose();
        }
    };

    const handleClose = () => {
        setAiResult(null);
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

    const commands = [
        { id: 'summarize', icon: FileText, title: '요약하기', desc: '핵심 내용을 간결하게' },
        { id: 'continue', icon: PenLine, title: '계속 작성하기', desc: '자연스럽게 이어서' },
        { id: 'improve', icon: Sparkles, title: '개선하기', desc: '더 명확하고 전문적으로' },
        { id: 'translate', icon: Languages, title: '번역하기', desc: '한국어 → 영어' }
    ];

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
                        {commands.map(cmd => (
                            <button key={cmd.id} className="ai-command-button" onClick={() => handleCommand(cmd.id)}>
                                <div className="ai-command-icon"><cmd.icon size={20} /></div>
                                <div className="ai-command-info">
                                    <div className="ai-command-title">{cmd.title}</div>
                                    <div className="ai-command-desc">{cmd.desc}</div>
                                </div>
                                <ChevronRight size={16} className="ai-command-arrow" />
                            </button>
                        ))}
                        <button className="ai-command-button ai-command-ask" onClick={() => setShowAskAI(true)}>
                            <div className="ai-command-icon"><MessageSquare size={20} /></div>
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
                            <button type="submit" className="ai-ask-submit" disabled={!askAIInput.trim()}>
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
                        <div className="ai-result-content">{aiResult}</div>
                        <div className="ai-result-actions">
                            <button className="ai-action-reject" onClick={() => setAiResult(null)}>
                                <X size={18} />취소
                            </button>
                            <button className="ai-action-accept" onClick={handleAccept}>
                                <Check size={18} />적용하기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 메뉴바 컴포넌트
const MenuBar = ({ editor }) => {
    if (!editor) return null;

    const menuButtons = [
        { action: 'undo', icon: Undo, title: '실행 취소', canCheck: true },
        { action: 'redo', icon: Redo, title: '다시 실행', canCheck: true },
        { divider: true },
        { action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), icon: Heading1, title: '제목 1', active: () => editor.isActive('heading', { level: 1 }) },
        { action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: Heading2, title: '제목 2', active: () => editor.isActive('heading', { level: 2 }) },
        { action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), icon: Heading3, title: '제목 3', active: () => editor.isActive('heading', { level: 3 }) },
        { divider: true },
        { action: 'toggleBulletList', icon: List, title: '글머리 기호 목록', active: 'bulletList' },
        { action: 'toggleOrderedList', icon: ListOrdered, title: '번호 매기기 목록', active: 'orderedList' },
        { divider: true },
        { action: 'toggleBold', icon: Bold, title: '굵게', active: 'bold' },
        { action: 'toggleItalic', icon: Italic, title: '기울임', active: 'italic' },
        { action: 'toggleStrike', icon: Strikethrough, title: '취소선', active: 'strike' },
        { action: 'toggleCode', icon: Code, title: '인라인 코드', active: 'code' },
        { action: 'toggleUnderline', icon: UnderlineIcon, title: '밑줄', active: 'underline' },
        { action: 'toggleHighlight', icon: Highlighter, title: '형광펜', active: 'highlight' },
        { divider: true },
        { action: () => editor.chain().focus().setTextAlign('left').run(), icon: AlignLeft, title: '왼쪽 정렬', active: () => editor.isActive({ textAlign: 'left' }) },
        { action: () => editor.chain().focus().setTextAlign('center').run(), icon: AlignCenter, title: '가운데 정렬', active: () => editor.isActive({ textAlign: 'center' }) },
        { action: () => editor.chain().focus().setTextAlign('right').run(), icon: AlignRight, title: '오른쪽 정렬', active: () => editor.isActive({ textAlign: 'right' }) },
        { action: () => editor.chain().focus().setTextAlign('justify').run(), icon: AlignJustify, title: '양쪽 정렬', active: () => editor.isActive({ textAlign: 'justify' }) }
    ];

    return (
        <div className="menu-bar">
            {menuButtons.map((btn, idx) => {
                if (btn.divider) return <div key={idx} className="divider"></div>;

                const Icon = btn.icon;
                const isActive = typeof btn.active === 'function' ? btn.active() : editor.isActive(btn.active);
                const onClick = typeof btn.action === 'function'
                    ? btn.action
                    : () => editor.chain().focus()[btn.action]().run();
                const disabled = btn.canCheck && !editor.can()[btn.action]();

                return (
                    <button
                        key={idx}
                        onClick={onClick}
                        disabled={disabled}
                        className={isActive ? 'menu-button is-active' : 'menu-button'}
                        title={btn.title}
                    >
                        <Icon size={18} />
                    </button>
                );
            })}
        </div>
    );
};

// AI 제안 사이드바
const SuggestionsSidebar = ({ suggestions, isAnalyzing, onApply, onApplyAll, onDismiss, onHighlight, onClearHighlight, isApplying }) => {
    const badgeLabels = { spelling: '맞춤법', grammar: '어순', style: '스타일' };

    return (
        <div className="ai-suggestions-sidebar">
            <div className="suggestions-header">
                <div className="suggestions-title">
                    <Sparkles size={18} className="suggestions-icon" />
                    <h3>AI 제안</h3>
                </div>
                {suggestions.length > 0 && (
                    <button className="apply-all-button" onClick={onApplyAll} disabled={isApplying}>
                        <Check size={16} />
                        모두 적용
                    </button>
                )}
            </div>

            <div className="suggestions-list">
                {isAnalyzing && (
                    <div className="analyzing-state">
                        <div className="analyzing-spinner"></div>
                        <p>AI가 분석 중...</p>
                    </div>
                )}

                {!isAnalyzing && suggestions.length === 0 && (
                    <div className="empty-suggestions">
                        <MessageSquare size={32} className="empty-icon" />
                        <p><strong>Ctrl + Enter</strong>를 눌러</p>
                        <p>맞춤법과 어순을 검사하세요</p>
                        <p className="empty-hint">텍스트가 10자 이상일 때 작동합니다</p>
                    </div>
                )}

                {!isAnalyzing && suggestions.map((suggestion, index) => (
                    <div
                        key={index}
                        className="suggestion-card"
                        onMouseEnter={() => onHighlight(suggestion)}
                        onMouseLeave={onClearHighlight}
                    >
                        <div className="suggestion-header">
                            <div className={`suggestion-badge ${suggestion.type}`}>
                                {badgeLabels[suggestion.type]}
                            </div>
                            <button className="dismiss-button" onClick={() => onDismiss(suggestion)} title="무시">
                                <X size={14} />
                            </button>
                        </div>

                        <h4 className="suggestion-title">{suggestion.title}</h4>
                        <p className="suggestion-description">{suggestion.description}</p>

                        {suggestion.original && suggestion.suggestion && (
                            <div className="suggestion-change">
                                <div className="change-from">
                                    <X size={14} className="change-icon" />
                                    <span>{suggestion.original}</span>
                                </div>
                                <div className="change-to">
                                    <Check size={14} className="change-icon" />
                                    <span>{suggestion.suggestion}</span>
                                </div>
                            </div>
                        )}

                        <button
                            className="apply-suggestion-button"
                            onClick={() => onApply(suggestion)}
                            disabled={isApplying}
                        >
                            적용하기
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 메인 에디터 컴포넌트
const TiptapEditor = () => {
    const [showAIModal, setShowAIModal] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastAnalyzedText, setLastAnalyzedText] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const highlightTimeoutRef = useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: `
            <p>텍스트를 <strong>선택</strong>하면 <em>Bubble Menu</em>가 나타납니다.</p>
            <p><strong>Ctrl + Enter</strong>를 누르면 AI가 맞춤법과 어순을 분석합니다.</p>
        `,
        editorProps: {
            attributes: { class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none' },
            handleKeyDown: (view, event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    const text = view.state.doc.textContent.trim();
                    if (text.length > 10 && text !== lastAnalyzedText && !isAnalyzing && !isApplying) {
                        handleAnalyze(text);
                    }
                    return true;
                }
                return false;
            },
        },
    });

    const handleAnalyze = async (text) => {
        setIsAnalyzing(true);
        setLastAnalyzedText(text);
        const results = await analyzeSpelling(text);
        setSuggestions(results);
        setIsAnalyzing(false);
    };

    const applySuggestion = (suggestion) => {
        if (!editor || isApplying) return;

        setIsApplying(true);
        const { state: { doc } } = editor;
        const result = findTextInDocument(doc, suggestion.original, suggestion.suggestion);

        if (!result) {
            console.warn('텍스트를 찾을 수 없습니다:', suggestion.original);
            setIsApplying(false);
            return;
        }

        const position = getTextPosition(doc, result.index, result.searchText.length);
        if (!position) {
            setIsApplying(false);
            return;
        }

        editor.chain().focus()
            .setTextSelection({ from: position.from, to: position.to })
            .insertContent(result.finalSuggestion)
            .run();

        setSuggestions(prev => prev.filter(s => s !== suggestion));
        setTimeout(() => {
            setLastAnalyzedText(editor.getText().trim());
            setIsApplying(false);
        }, 300);
    };

    const applyAllSuggestions = () => {
        if (suggestions.length === 0 || isApplying) return;

        setIsApplying(true);
        const sortedSuggestions = [...suggestions].sort((a, b) => {
            const textContent = editor.state.doc.textContent;
            return textContent.indexOf(b.original) - textContent.indexOf(a.original);
        });

        sortedSuggestions.forEach((suggestion, idx) => {
            setTimeout(() => {
                const { state: { doc } } = editor;
                const result = findTextInDocument(doc, suggestion.original, suggestion.suggestion);

                if (result) {
                    const position = getTextPosition(doc, result.index, result.searchText.length);
                    if (position) {
                        editor.chain().focus()
                            .setTextSelection({ from: position.from, to: position.to })
                            .insertContent(result.finalSuggestion)
                            .run();
                    }
                }

                if (idx === sortedSuggestions.length - 1) {
                    setTimeout(() => {
                        setSuggestions([]);
                        setLastAnalyzedText(editor.getText().trim());
                        setIsApplying(false);
                    }, 100);
                }
            }, idx * 100);
        });
    };

    const highlightSuggestion = (suggestion) => {
        if (!editor) return;

        const { state: { doc } } = editor;
        const result = findTextInDocument(doc, suggestion.original);

        if (!result) return;

        const position = getTextPosition(doc, result.index, result.searchText.length);
        if (!position) return;

        editor.chain().focus().setTextSelection({ from: position.from, to: position.to }).run();

        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = setTimeout(() => {
            editor.chain().setTextSelection(0).run();
        }, 3000);
    };

    const clearHighlight = () => {
        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }
        if (editor) {
            editor.chain().setTextSelection(0).run();
        }
    };

    return (
        <div className="tiptap-editor-wrapper">
            <div className="tiptap-editor-container">
                <MenuBar editor={editor} />

                {editor && (
                    <BubbleMenu
                        className="bubble-menu"
                        editor={editor}
                        tippyOptions={{ duration: 100 }}
                        shouldShow={({ from, to }) => from !== to}
                    >
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="굵게"><Bold size={18} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="기울임"><Italic size={18} /></button>
                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''} title="밑줄"><UnderlineIcon size={18} /></button>
                        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="취소선"><Strikethrough size={18} /></button>
                        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'is-active' : ''} title="형광펜"><Highlighter size={18} /></button>
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

            <SuggestionsSidebar
                suggestions={suggestions}
                isAnalyzing={isAnalyzing}
                onApply={applySuggestion}
                onApplyAll={applyAllSuggestions}
                onDismiss={(s) => setSuggestions(prev => prev.filter(item => item !== s))}
                onHighlight={highlightSuggestion}
                onClearHighlight={clearHighlight}
                isApplying={isApplying}
            />
        </div>
    );
};

export default TiptapEditor;