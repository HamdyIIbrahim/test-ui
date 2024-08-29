import type { FormInstance } from 'antd';
import { Button, Form, Input, Space } from 'antd';
import { store } from './synced-store/SyncedStore';
import { useSyncedStore } from '@syncedstore/react';
import { useEffect } from 'react';
// import { useCallback, useEffect, useRef, useState } from 'react';
// import io from 'Socket.io-client';
let socket: any;

const FormWidget = () => {
  const [form] = Form.useForm();
  const formState = useSyncedStore(store);

  //   console.log('formState', formState);
  //   const socketInitializer = async () => {
  //     await fetch('/api/socket');
  //     socket = io();

  //     socket.on('connect', () => {
  //       console.log('connected');
  //     });
  //   };
  //   useEffect(() => {
  //     socketInitializer();
  //   }, []);

  useEffect(() => {
    if (formState.formData.data) {
      const parsedData = JSON.parse(formState.formData.data);
      form.setFieldsValue(parsedData);
    }
  }, [form, formState.formData.data]);

  const handleFormChange = (
    changedValues: Record<string, any>,
    allValues: any
  ) => {
    formState.formData['data'] = JSON.stringify(allValues);
    // const stringifiedChangedValues = JSON.stringify(changedValues);
    // console.log('changedValues', changedValues);
    // console.log('allValues', allValues);
    // socket.emit('input-change', stringifiedChangedValues);
  };
  return (
    <div className='form'>
      <Form
        form={form}
        name='validateOnly'
        layout='vertical'
        autoComplete='off'
        onValuesChange={handleFormChange}
      >
        <h5>{formState.formData.data}</h5>
        <Form.Item name='id' label='ID'>
          <Input />
        </Form.Item>
        <Form.Item name='name' label='Name' rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name='settings' label='Settings'>
          <Input.TextArea rows={5} />
        </Form.Item>
        {/* <Form.Item>
        <Button htmlType='submit'>Reset</Button>
      </Form.Item> */}
      </Form>
    </div>
  );
};

export default FormWidget;

// function useDebouncedCallback(fnc: Function, delay: number) {
//     const callbackRef = useRef(fnc);

//     // Update the ref to the latest function on each render
//     useEffect(() => {
//       callbackRef.current = fnc;
//     }, [fnc]);

//     const debouncedCallback = useCallback(() => {
//       const handler = setTimeout(() => {
//         callbackRef.current();
//       }, delay);

//       return () => {
//         clearTimeout(handler);
//       };
//     }, [delay]);

//     return debouncedCallback;
//   }
