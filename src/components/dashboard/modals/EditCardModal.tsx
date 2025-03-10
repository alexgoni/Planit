'use client';

import { editCard, postCardImage } from '@/app/api/cards';
import { getColumnList } from '@/app/api/columns';
import { getMembers } from '@/app/api/members';
import emitCards from '@/app/api/pusher/cards/emit';
import Button from '@/components/commons/button';
import ProfileCircle from '@/components/commons/circle/ProfileCircle';
import Input from '@/components/commons/input';
import DateInput from '@/components/commons/input/DateInput';
import DropdownInput from '@/components/commons/input/DropdownInput';
import ImageInput from '@/components/commons/input/ImageInput';
import TagInput from '@/components/commons/input/TagInput';
import Textarea from '@/components/commons/input/Textarea';
import Modal from '@/components/commons/modal';
import Tag from '@/components/commons/tag';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuthStore } from '@/store/authStore';
import { usePusherStore } from '@/store/pusherStore';
import { formatDate } from '@/utils/date';
import { CardResponse, Column, EditCardRequest, Member } from '@planit-types';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: number;
  columnId: number;
  currentCardData: CardResponse;
  onColumnUpdate: () => void;
};

export type EditCardInputs = {
  columnId: number;
  assignee?: number;
  title: string;
  description: string;
  dueDate?: Date;
  tags: string[];
  image?: string;
};

export default function EditCardModal({
  isOpen,
  onClose,
  dashboardId,
  currentCardData,
  onColumnUpdate,
}: Props) {
  const { darkMode } = useDarkMode();
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Column | null>(null);
  const [statusList, setStatusList] = useState<Column[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const { socketId } = usePusherStore();
  const { userInfo } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isValid },
  } = useForm<EditCardInputs>({
    defaultValues: {
      columnId: currentCardData.columnId,
      assignee: currentCardData.assignee?.id,
      title: currentCardData.title,
      description: currentCardData.description,
      dueDate: currentCardData.dueDate
        ? new Date(currentCardData.dueDate)
        : undefined,
      tags: currentCardData.tags,
      image: currentCardData.imageUrl ?? undefined,
    },
  });

  const onSubmit: SubmitHandler<EditCardInputs> = async ({
    assignee,
    title,
    description,
    tags,
    dueDate,
    image,
    columnId,
  }) => {
    const reqBody: EditCardRequest = {
      assigneeUserId: assignee,
      columnId,
      title,
      description,
      tags,
      dueDate: dueDate && formatDate(dueDate),
      imageUrl: image,
    };

    const res = await editCard({
      cardId: currentCardData.id,
      formValue: reqBody,
    });

    if ('message' in res) {
      toast.error(res.message);
      return;
    }

    onClose();
    onColumnUpdate();
    reset();
    toast.success('카드를 수정하였습니다.');
    await emitCards({
      member: userInfo?.nickname,
      action: 'edit',
      card: title,
      roomId: String(dashboardId),
      socketId: socketId as string,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const [columnRes, memberRes] = await Promise.all([
        getColumnList(dashboardId),
        getMembers({ dashboardId }),
      ]);

      if ('message' in columnRes) {
        toast.error(columnRes.message);
        return;
      }

      if ('message' in memberRes) {
        toast.error(memberRes.message);
        return;
      }

      setStatusList(columnRes.data);
      setMembers(memberRes.members);
      setCurrentStatus(
        columnRes.data.filter(
          (each) => each.id === currentCardData.columnId,
        )[0],
      );
      setIsLoaded(true);
    })();
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={() => {}}>
      {isLoaded && (
        <form className="custom-scrollbar max-h-900 w-340 overflow-y-auto p-20 md:min-w-506 md:p-24">
          <div className="mb-18 flex items-center justify-between md:mb-22">
            <h1 className="text-20 font-bold dark:text-white">할 일 수정</h1>
            <Image
              src={darkMode ? '/icon/close_gray.svg' : '/icon/close.svg'}
              alt="close"
              width={32}
              height={32}
              className="cursor-pointer"
              onClick={onClose}
            />
          </div>

          <div className="flex flex-col justify-between md:flex-row">
            <div>
              <label
                htmlFor="columnId"
                className="mb-8 block text-14 text-black-800 dark:text-white md:mt-0 md:text-16"
              >
                상태
              </label>
              <DropdownInput
                name="columnId"
                control={control}
                defaultValue={
                  <Tag type="round" text={currentStatus?.title as string} />
                }
              >
                {statusList.map((status) => (
                  <DropdownInput.Option key={status.id} id={status.id}>
                    <Tag type="round" text={status.title} />
                  </DropdownInput.Option>
                ))}
              </DropdownInput>
            </div>

            <div>
              <label
                htmlFor="assignee"
                className="mb-8 mt-18 block text-14 text-black-800 dark:text-white md:mt-0 md:text-16"
              >
                담당자
              </label>
              <DropdownInput
                name="assignee"
                control={control}
                defaultValue={
                  currentCardData.assignee ? (
                    <div className="flex items-center gap-6">
                      <ProfileCircle
                        data={currentCardData.assignee}
                        styles="size-26 text-12"
                      />
                      {currentCardData.assignee.nickname}
                    </div>
                  ) : (
                    <span className="text-gray-300">이름을 입력해 주세요</span>
                  )
                }
              >
                {members.map((member) => (
                  <DropdownInput.Option key={member.userId} id={member.userId}>
                    <div className="flex items-center gap-6">
                      <ProfileCircle data={member} styles="size-26 text-14" />
                      {member.nickname}
                    </div>
                  </DropdownInput.Option>
                ))}
              </DropdownInput>
            </div>
          </div>

          <label
            htmlFor="title"
            className="mb-8 mt-18 block text-14 text-black-800 dark:text-white md:mt-20 md:text-16"
          >
            제목{' '}
            <span className="text-violet-dashboard dark:text-white">*</span>
          </label>
          <Input
            id="title"
            type="text"
            placeholder="제목을 입력해 주세요"
            register={{ ...register('title', { required: true }) }}
          />

          <label
            htmlFor="description"
            className="mb-8 mt-18 block text-14 text-black-800 dark:text-white md:mt-20 md:text-16"
          >
            설명{' '}
            <span className="text-violet-dashboard dark:text-white">*</span>
          </label>
          <Textarea
            id="description"
            placeholder="설명을 입력해 주세요"
            register={{ ...register('description', { required: true }) }}
          />

          <label
            htmlFor="dueDate"
            className="mb-8 mt-18 block text-14 text-black-800 dark:text-white md:mt-20 md:text-16"
          >
            마감일
          </label>
          <DateInput
            control={control}
            placeholder="날짜를 입력해 주세요"
            name="dueDate"
            defaultValue={
              currentCardData.dueDate && new Date(currentCardData.dueDate)
            }
          />

          <label
            htmlFor="tags"
            className="mb-8 mt-18 block text-14 text-black-800 dark:text-white md:mt-20 md:text-16"
          >
            태그
          </label>
          <TagInput
            id="tags"
            placeholder="입력 후 Enter"
            name="tags"
            control={control}
            defaultValue={currentCardData.tags}
          />

          <label
            htmlFor="image"
            className="mb-8 mt-18 block text-14 text-black-800 dark:text-white md:mt-20 md:text-16"
          >
            이미지
          </label>
          <ImageInput
            control={control}
            name="image"
            type="card"
            columnId={currentCardData.columnId}
            fetchFn={postCardImage}
            defaultValue={currentCardData.imageUrl}
          />

          <div className="mt-18 flex justify-between gap-12 md:mt-28 md:justify-end">
            <Button
              onClick={() => {
                onClose();
              }}
              styles="py-12 px-54 text-16 md:py-14 md:text-18 md:px-46 md:py-14"
              text="취소"
              cancel
            />
            <Button
              onClick={handleSubmit(onSubmit)}
              styles="py-12 px-54 text-16 md:py-14 md:text-18 md:px-46 md:py-14"
              text="수정"
              disabled={!isValid}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
