import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
  UserOutlined,
  LogoutOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/questions',
      icon: <QuestionCircleOutlined />,
      label: 'Question Bank',
    },
    {
      key: '/questions/import',
      icon: <UploadOutlined />,
      label: 'Import Questions',
    },
    {
      key: '/grading',
      icon: <DashboardOutlined />,
      label: 'Grading Dashboard',
    },
    {
      key: '/exam-room',
      icon: <VideoCameraOutlined />,
      label: 'Exam Room (Demo)',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>
            <LogoutOutlined style={{ marginRight: 8 }} />
            Logout
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {/* Nội dung của các page sẽ được render ở đây */}
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          SWD392 Group 3 ©{new Date().getFullYear()} - AI Interview Platform
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
