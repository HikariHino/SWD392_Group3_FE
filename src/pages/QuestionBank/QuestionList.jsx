import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Pagination, Popconfirm, Spin } from 'antd';
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CloudDownloadOutlined,
  DownOutlined,
  EditOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  SoundOutlined,
  TableOutlined,
  TagsOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { questionApi } from '../../services/questionApi';
import { BLOOM_LEVELS, getBloomLevel } from '../../utils/bloomLevel';
import { parseApiError } from '../../utils/apiError';
import { formatDate } from '../../utils/formatDate';
import QuestionFormModal from './components/QuestionFormModal';
import './QuestionList.css';

const DEFAULT_QUERY = {
  searchTerm: '',
  courseId: '',
  bloomLevel: '',
  pageIndex: 1,
  pageSize: 5,
};

const BLOOM_ICONS = {
  Remember: <BookOutlined />,
  Understand: <BookOutlined />,
  Apply: <ExperimentOutlined />,
  Analyze: <ApartmentOutlined />,
  Evaluate: <CheckCircleOutlined />,
  Create: <BulbOutlined />,
};

const shortId = (id) => id.slice(0, 8).toUpperCase();
const sumMaxScore = (rubrics = []) => Math.round(rubrics.reduce((sum, r) => sum + r.maxScore, 0) * 100) / 100;

function BloomBadge({ value }) {
  const bloom = getBloomLevel(value);
  if (!bloom) return null;
  return (
    <span className={`bloom-badge bloom-${bloom.name.toLowerCase()}`}>
      {BLOOM_ICONS[bloom.name]} Bloom: {bloom.label} ({bloom.name})
    </span>
  );
}

export default function QuestionList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState({ items: [], totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // modal = { open, questionId } ; questionId = null -> Thêm mới
  const [modal, setModal] = useState({ open: false, questionId: null });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await questionApi.getQuestions({
        pageIndex: query.pageIndex,
        pageSize: query.pageSize,
        searchTerm: query.searchTerm || undefined,
        courseId: query.courseId || undefined,
        bloomLevel: query.bloomLevel || undefined,
      });

      // Trang hiện tại bị trống (VD: vừa xoá câu cuối cùng của trang) -> lùi về trang cuối còn dữ liệu
      if (res.items.length === 0 && res.totalCount > 0 && query.pageIndex > 1) {
        setQuery((q) => ({ ...q, pageIndex: Math.max(1, Math.ceil(res.totalCount / q.pageSize)) }));
        return;
      }
      setData({ items: res.items, totalCount: res.totalCount });
      setSelectedId((current) => (res.items.some((q) => q.id === current) ? current : res.items[0]?.id ?? null));
    } catch (error) {
      message.error(parseApiError(error, 'Không tải được danh sách câu hỏi.').message);
    } finally {
      setLoading(false);
    }
  }, [query, message]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    questionApi
      .getCourses()
      .then(({ data: res }) => setCourses(res))
      .catch((error) => message.error(parseApiError(error, 'Không tải được danh sách môn học.').message));
  }, [message]);

  // Tìm kiếm tự động sau khi ngừng gõ 400ms
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((q) => (q.searchTerm === searchText.trim() ? q : { ...q, searchTerm: searchText.trim(), pageIndex: 1 }));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const updateFilter = (patch) => setQuery((q) => ({ ...q, ...patch, pageIndex: 1 }));

  const resetFilters = () => {
    setSearchText('');
    setQuery(DEFAULT_QUERY);
  };

  const selectedQuestion = useMemo(
    () => data.items.find((q) => q.id === selectedId) ?? null,
    [data.items, selectedId],
  );
  const selectedCourse = courses.find((c) => c.id === query.courseId);
  const rubricCountOnPage = data.items.reduce((sum, q) => sum + (q.rubrics?.length || 0), 0);
  const totalPages = Math.max(1, Math.ceil(data.totalCount / query.pageSize));

  const openCreate = () => setModal({ open: true, questionId: null });
  const openEdit = (id) => setModal({ open: true, questionId: id });

  const handleDelete = async (question) => {
    setDeletingId(question.id);
    try {
      await questionApi.deleteQuestion(question.id);
      message.success('Đã xoá câu hỏi khỏi ngân hàng đề.');
      fetchQuestions();
    } catch (error) {
      message.error(parseApiError(error, 'Xoá câu hỏi thất bại.').message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    const isCreate = !modal.questionId;
    setModal({ open: false, questionId: null });
    if (isCreate && query.pageIndex !== 1) {
      // Câu hỏi mới được sắp xếp lên đầu (CreatedAt giảm dần) -> quay về trang 1 để thấy ngay
      setQuery((q) => ({ ...q, pageIndex: 1 }));
    } else {
      fetchQuestions();
    }
  };

  const exportRubric = () => {
    if (!selectedQuestion) return;
    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = selectedQuestion.rubrics.map((r) => [escape(r.criteria), `${r.weight}%`, r.maxScore].join(','));
    const content = ['Tiêu chí,Trọng số,Điểm tối đa', ...rows].join('\n');
    const url = URL.createObjectURL(new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rubric-${shortId(selectedQuestion.id)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Đã xuất file rubric');
  };

  return (
    <div className="question-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span>{selectedCourse?.code ?? 'Tất cả môn học'}</span><i /> Ngân hàng học liệu</div>
          <h1>Ngân hàng Câu hỏi & Rubric</h1>
          <p>Quản lý câu hỏi vấn đáp và chuẩn hóa ma trận chấm điểm (Rubric) cho từng câu hỏi.</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/questions/import')}><CloudDownloadOutlined /> Nhập từ tài liệu</button>
          <button className="btn btn-primary" type="button" onClick={openCreate}><PlusOutlined /> Tạo câu hỏi mới</button>
        </div>
      </section>

      <section className="stats-grid">
        <article><span className="stat-icon blue"><FileTextOutlined /></span><div><small>Tổng câu hỏi</small><strong>{data.totalCount}</strong><em>Theo bộ lọc hiện tại</em></div></article>
        <article><span className="stat-icon violet"><BookOutlined /></span><div><small>Môn học</small><strong>{courses.length}</strong><em>Đang có trong hệ thống</em></div></article>
        <article><span className="stat-icon teal"><TableOutlined /></span><div><small>Tiêu chí Rubric</small><strong>{rubricCountOnPage}</strong><em>Trên trang hiện tại</em></div></article>
        <article><span className="stat-icon amber"><ThunderboltOutlined /></span><div><small>Trang</small><strong>{query.pageIndex} <b>/ {totalPages}</b></strong><em>{query.pageSize} câu hỏi mỗi trang</em></div></article>
      </section>

      <section className="filter-bar">
        <label className="search-box">
          <SearchOutlined />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Tìm theo nội dung câu hỏi..."
            aria-label="Tìm theo nội dung câu hỏi"
          />
          {searchText && (
            <button className="clear-search" type="button" aria-label="Xoá từ khoá" onClick={() => setSearchText('')}><CloseOutlined /></button>
          )}
        </label>
        <div className="filter-divider" />
        <label className="select-wrap">
          <BookOutlined />
          <select value={query.courseId} onChange={(event) => updateFilter({ courseId: event.target.value })} aria-label="Lọc theo môn học">
            <option value="">Tất cả môn học</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
          </select>
          <DownOutlined />
        </label>
        <label className="select-wrap">
          <FilterOutlined />
          <select value={query.bloomLevel} onChange={(event) => updateFilter({ bloomLevel: event.target.value })} aria-label="Lọc theo Bloom Level">
            <option value="">Tất cả mức Bloom</option>
            {BLOOM_LEVELS.map((b) => <option key={b.value} value={b.value}>{b.value}. {b.name} - {b.label}</option>)}
          </select>
          <DownOutlined />
        </label>
        <button className="icon-button settings-filter" type="button" aria-label="Xoá bộ lọc và tải lại" title="Xoá bộ lọc và tải lại" onClick={resetFilters}><ReloadOutlined /></button>
      </section>

      <div className="content-grid">
        <section className="question-column">
          <div className="section-title-row">
            <div><h2>Danh sách câu hỏi</h2><span>{data.totalCount} kết quả</span></div>
            <span className="sort-note">Sắp xếp: Mới tạo trước</span>
          </div>

          <Spin spinning={loading}>
            <div className="question-list">
              {!loading && data.items.length === 0 && (
                <div className="empty-state">
                  <SearchOutlined />
                  <h3>Không tìm thấy câu hỏi</h3>
                  <p>Thử thay đổi từ khóa, bộ lọc hoặc tạo câu hỏi mới.</p>
                </div>
              )}
              {data.items.map((question) => (
                <article
                  key={question.id}
                  className={`question-card ${question.id === selectedId ? 'selected' : ''}`}
                  onClick={() => setSelectedId(question.id)}
                >
                  <div className="card-topline">
                    <div className="badge-row">
                      <BloomBadge value={question.bloomLevel} />
                      <span className="status-badge official" title={question.courseName}><TagsOutlined /> {question.courseCode}</span>
                      <code>#{shortId(question.id)}</code>
                    </div>
                    <span className="used-count"><TableOutlined /> {question.rubrics.length} tiêu chí · {sumMaxScore(question.rubrics)} điểm</span>
                  </div>

                  <div className="question-content">
                    <h3>“{question.content}”</h3>
                    {question.rubrics.length > 0 && (
                      <div className="rubric-summary">
                        <div className="summary-head">
                          <span><TableOutlined /> Ma trận Rubric ({question.rubrics.length} tiêu chí – Tổng {sumMaxScore(question.rubrics)} điểm)</span>
                          <b>Trọng số 100%</b>
                        </div>
                        <div className="criterion-grid">
                          {question.rubrics.map((rubric, index) => (
                            <div key={rubric.id}>
                              <small>Tiêu chí {index + 1} ({rubric.weight}%)</small>
                              <strong>{rubric.criteria}</strong>
                              <span>Tối đa {rubric.maxScore} điểm</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <small>
                      {question.updatedAt
                        ? `Cập nhật lần cuối: ${formatDate(question.updatedAt)}`
                        : `Ngày tạo: ${formatDate(question.createdAt)}`}
                    </small>
                    <div>
                      <Popconfirm
                        title="Xoá câu hỏi này?"
                        description="Câu hỏi và các tiêu chí Rubric đi kèm sẽ bị xoá khỏi ngân hàng đề."
                        okText="Xoá"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(question)}
                      >
                        <button className="btn btn-danger" type="button" disabled={deletingId === question.id} onClick={(event) => event.stopPropagation()}>
                          <CloseOutlined /> {deletingId === question.id ? 'Đang xoá...' : 'Xóa'}
                        </button>
                      </Popconfirm>
                      <button className="btn btn-secondary" type="button" onClick={(event) => { event.stopPropagation(); openEdit(question.id); }}><EditOutlined /> Chỉnh sửa</button>
                      <button className="btn btn-soft" type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(question.id); }}><EyeOutlined /> Xem chi tiết Rubric</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Spin>

          {data.totalCount > 0 && (
            <div className="question-pagination">
              <Pagination
                current={query.pageIndex}
                pageSize={query.pageSize}
                total={data.totalCount}
                showSizeChanger
                pageSizeOptions={[5, 10, 20, 50]}
                showTotal={(total) => `Tổng ${total} câu hỏi`}
                onChange={(pageIndex, pageSize) =>
                  setQuery((q) => ({ ...q, pageIndex: pageSize !== q.pageSize ? 1 : pageIndex, pageSize }))}
              />
            </div>
          )}
        </section>

        <aside className="rubric-column">
          <div className="rubric-panel">
            <div className="rubric-header">
              <div>
                <h2><TableOutlined /> Ma trận Rubric Chuẩn</h2>
                <p>{selectedQuestion ? <>Đang xem câu hỏi: <code>#{shortId(selectedQuestion.id)}</code></> : 'Chọn một câu hỏi để xem Rubric'}</p>
              </div>
              <button className="icon-button" type="button" aria-label="Chỉnh sửa Rubric" disabled={!selectedQuestion} onClick={() => openEdit(selectedQuestion.id)}><SettingOutlined /></button>
            </div>
            <div className="ai-notice"><RobotOutlined /><p><b>Cơ sở đánh giá tự động (LLM Evaluator):</b> Ma trận này được nạp vào prompt thẩm định AI khi sinh viên trả lời trong phòng viva.</p></div>

            {selectedQuestion?.rubrics.map((rubric, index) => (
              <div className="rubric-criterion compact" key={rubric.id}>
                <div className="criterion-heading">
                  <strong>Tiêu chí {index + 1}: {rubric.criteria} ({rubric.weight}%)</strong>
                  <code>Tối đa: {rubric.maxScore} điểm</code>
                </div>
              </div>
            ))}
            {selectedQuestion && selectedQuestion.rubrics.length === 0 && (
              <p className="rubric-empty">Câu hỏi này chưa có tiêu chí Rubric.</p>
            )}

            <div className="rubric-footer">
              <button type="button" onClick={exportRubric} disabled={!selectedQuestion}><FileExcelOutlined /> Xuất file Rubric</button>
              <button className="btn btn-soft" type="button" disabled={!selectedQuestion} onClick={() => openEdit(selectedQuestion.id)}><EditOutlined /> Chỉnh sửa Rubric</button>
            </div>
          </div>

          <div className="test-run-card">
            <span><SoundOutlined /></span>
            <div><strong>Chạy thử nghiệm mô phỏng Viva</strong><small>Kiểm thử giọng nói AI đặt câu hỏi và chấm thử</small></div>
            <button className="btn btn-primary" type="button" onClick={() => navigate('/exam-room')}>Mở Test Run</button>
          </div>
        </aside>
      </div>

      <QuestionFormModal
        open={modal.open}
        questionId={modal.questionId}
        courses={courses}
        defaultCourseId={query.courseId || undefined}
        onCancel={() => setModal({ open: false, questionId: null })}
        onSaved={handleSaved}
      />
    </div>
  );
}
