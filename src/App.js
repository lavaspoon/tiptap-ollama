import React from 'react';
import './App.css';
import TiptapEditor from "./Tiptapeditor";

function App() {
    return (
        <div className="app">
            <header className="app-header">
                <h1>Tiptap 에디터</h1>
                <p>리액트로 구현한 리치 텍스트 에디터</p>
            </header>
            <main className="app-main">
                <TiptapEditor />
            </main>
        </div>
    );
}

export default App;