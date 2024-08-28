import type { FormInstance } from 'antd';
import { Button, Form, Input, Space } from 'antd';

const FormWidget = () => {
  const [form] = Form.useForm();
  return (
    <div className="form">
      <Form
        form={form}
        name='validateOnly'
        layout='vertical'
        autoComplete='off'
      >
        <Form.Item name='id' label='ID'>
          <Input />
        </Form.Item>
        <Form.Item name='name' label='Name' rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name='settings' label='Settings'>
          <Input />
        </Form.Item>
        {/* <Form.Item>
        <Button htmlType='submit'>Reset</Button>
      </Form.Item> */}
      </Form>
    </div>
  );
};

export default FormWidget;
