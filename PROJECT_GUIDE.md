# 勤怠管理システム プロジェクト構成図 (Project Guide)

このドキュメントは、本プロジェクトのディレクトリ構造、主要ファイルの場所、およびそれぞれの役割をまとめたものです。

---

## 📁 ルートディレクトリ (Root)

- `docker-compose.yml`: プロジェクト全体のDocker構成（Backend, Frontend, DB, pgAdmin）を定義。
- `README.md`: プロジェクトの概要と起動方法。
- `reset-db.bat`: データベースをリセットし、初期データを再シードするためのバッチファイル。

---

## 📂 バックエンド (Backend) - `/backend`

Node.js + Express + Prisma (PostgreSQL) で構築。

### 核心ロジック (Core Logic)
- `src/services/attendanceEngine.ts`: 打刻時間の15分単位の取整（切り上げ/切り捨て）、状態判定、工数計算ロジック。
- `src/modules/employees/employees.service.ts`: 従業員検索ロジック。**中日英語の多言語キーワード対応**（例：「在職」＝「Active」）やEnumマッピングを実装。

### データベース (Database & ORM)
- `prisma/schema.prisma`: テーブル定義（Employee, Attendance, AttendanceRule, LeaveRequestなど）。
- `prisma/seed.ts`: 初期シードデータ定義。

### モジュール (Modules) - `src/modules`
- `attendance.repo.ts`: **ページネーション・ソートの要**。Snapshot（快照）/Log（流水）の2モードを切り替え、手動ソートロジックも内包。
- `attendance.service.ts`: EngineとRepoの仲介。
- `leave/leave.service.ts`: 休暇申請のワークフロー（申請・承認・ステータス同期）を管理。

---

## 📂 フロントエンド (Frontend) - `/frontend`

React + Vite + TailwindCSS で構築。

### 画面 (Pages) - `src/pages`
- `Dashboard.tsx`: リアルタイム統計、打刻ログ（本日分）、従業員用クイックアクション。
- `AttendanceList.tsx`: **快照モード（本日最終状態）**と**流水モード（期間内全記録）**の切り替え、高度なフィルタリング、CSV出力。
- `Employees.tsx`: 従業員情報の一覧・詳細・作成・削除・CSV出力。
- `LeaveManagement.tsx`: 休暇の申請（従業員）および履歴管理（管理者/HR）。
- `EmployeeDetail.tsx`: 特定従業員の全履歴・監査トレース（変更履歴）の閲覧。

### 共通コンポーネント (Components)
- `src/components/common/Pagination.tsx`: **共通分页组件**。lucide-reactに依存せず、インラインSVGを使用した軽量設計。
- `src/contexts/AuthContext.tsx`: 権限（admin/manager/hr/viewer）ベースのアクセス制御。

---

## 🔄 データの流れ (Data Flow Summary)

1. **打刻**: フロントエンドまたはQRスキャナーからAPI呼出。
2. **計算・同期**: `attendance.service.ts` が状態を判定し、`attendance.repo.ts` を通じてDB保存。休暇承認時はプロフィールが自動同期される。
3. **一覧表示**: 全てのデータリスト（Attendance/Employees/Leave）は**サーバーサイド分页・ソート**を介して取得。
4. **管理**: 管理者/HRは「修正理由」を入力することで、過去の打刻を安全に修正し、監査ログを残せる。
