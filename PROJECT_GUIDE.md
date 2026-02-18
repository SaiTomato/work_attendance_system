# 勤怠管理システム プロジェクト構成図 (Project Guide)

このドキュメントは、本プロジェクトのディレクトリ構造、主要ファイルの場所、およびそれぞれの役割をまとめたものです。

---

## 📁 ルートディレクトリ (Root)

- `docker-compose.yml`: プロジェクト全体のDocker構成（Backend, Frontend, DB, pgAdmin）を定義します。
- `README.md`: プロジェクトの概要と起動方法が記載されています。
- `reset-db.bat`: データベースをリセットし、初期データを再シードするためのバッチファイルです。

---

## 📂 バックエンド (Backend) - `/backend`

Node.js + Express + Prisma (PostgreSQL) で構築されています。

### 核心ロジック (Core Logic)
- `src/services/attendanceEngine.ts`: **プロジェクトの最重要ファイル**。打刻時間の15分単位の取整（切り上げ/切り捨て）、状態判定（出席、遅刻、欠勤、早退）、および実工数の計算ロジックが記述されています。

### データベース (Database & ORM)
- `prisma/schema.prisma`: データベースのテーブル定義（Employee, Attendance, AttendanceRuleなど）を管理します。
- `prisma/seed.ts`: データベースの初期シードデータを定義します。
- `src/db/prisma.ts`: Prisma Clientのインスタンス化と接続設定。

### モジュール (Modules) - `src/modules`
機能ごとにディレクトリが分かれています（例: `attendance`, `employee`）。
- `attendance.repo.ts`: データベースへの直接的なクエリ操作（取得、統計計算など）を担当します。
- `attendance.service.ts`: ビジネスロジックの調整役。Engineを呼び出して状態を確定させ、Repoを通じて保存します。

### 通信と設定 (App & Routes)
- `src/app.ts`: Expressアプリケーションの設定（CORS, Cookie, Middleware）。
- `src/routes/`: 各機能のAPIエンドポイント定義。
- `src/types/index.ts`: バックエンド共通のTypeScript型定義（DailyStatsなど）。

---

## 📂 フロントエンド (Frontend) - `/frontend`

React + Vite + TailwindCSS で構築されています。

### 画面 (Pages) - `src/pages`
- `Dashboard.tsx`: 全体統計（出席数、異常数、早退・欠勤など）を統計カードで表示するメイン画面。
- `AttendanceList.tsx`: 勤怠ログの一覧表示、フィルタリング、および管理責任者による修正・削除画面。
- `Login.tsx`: 認証画面。

### 通信 (Services) - `src/services`
- `api.ts`: Axiosの設定（インターセプター、ベースURL、トークン管理）。
- `attendance.api.ts`: 勤怠データに関連するAPIリクエスト関数。

### 共通基盤 (Core)
- `src/contexts/AuthContext.tsx`: ユーザーのログイン状態と権限（admin/manager/viewer）を管理。
- `src/types/index.ts`: フロントエンド共通の型定義（バックエンドと同期）。
- `src/components/`: 各画面で使用される共通コンポーネントやモーダル。

---

## 🔄 データの流れ (Data Flow Summary)

1. **打刻**: フロントエンドから打刻APIが呼ばれる。
2. **計算**: `attendance.service.ts` が `attendanceEngine.ts` を使い、ルールに基づいた「取整済み時間」と「状態」を算出。
3. **保存**: `attendance.repo.ts` を通じて DB に保存。
4. **表示**: Dashboard または AttendanceList がデータを取得し、権限に応じた表示を行う。
