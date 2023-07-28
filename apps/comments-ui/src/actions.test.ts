import { Actions, ActionHandler } from "./actions";
import { GhostApi } from "./utils/api";

const mockSocket = {
    emit: vi.fn(),
};

const mockApi = {
    comments: {
        add: vi.fn(),
        edit: vi.fn(),
    },
};

describe("Actions", () => {
    describe("addComment", () => {
        it("should add a new comment and update commentCount", async () => {
            const state = {
                commentCount: 0,
                comments: [],
                postId: "post-id",
            };

            const commentData = {};

            const comment = {};

            mockApi.comments.add.mockResolvedValue({ comments: [comment] });

            const newState = await Actions.addComment({
                state,
                api: mockApi as GhostApi,
                data: commentData,
                socket: mockSocket,
            });

            expect(newState.comments).toEqual([comment]);
            expect(newState.commentCount).toBe(1);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "updateCommentCount",
                1,
                "post-id"
            );
        });
    });

    describe("addReply", () => {
        it("should add a new reply to a comment and update commentCount", async () => {
            const parentComment = {
                id: "parent-comment-id",
                replies: [],
                count: {
                    replies: 0,
                },
            };

            const state = {
                commentCount: 1,
                comments: [parentComment],
                postId: "post-id",
            };

            const replyData = {
                reply: {},
                parent: parentComment,
            };

            const reply = {};
            mockApi.comments.add.mockResolvedValue({ comments: [reply] });

            const newState = await Actions.addReply({
                state,
                api: mockApi as GhostApi,
                data: replyData,
                socket: mockSocket,
            });

            expect(newState.comments[0].replies).toEqual([reply]);
            expect(newState.comments[0].count.replies).toBe(1);
            expect(newState.commentCount).toBe(2);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "updateCommentCount",
                2,
                "post-id"
            );
        });
    });

    describe("deleteComment", () => {
        it("should delete a comment and update commentCount", async () => {
            const commentToDelete = {
                id: "comment-to-delete-id",
            };

            const state = {
                commentCount: 2,
                comments: [
                    {
                        id: "comment-1",
                        replies: [],
                        count: {
                            replies: 0,
                        },
                    },
                    {
                        id: "comment-to-delete-id",
                        replies: [],
                        count: {
                            replies: 0,
                        },
                    },
                ],
                postId: "post-id",
            };

            mockApi.comments.edit.mockResolvedValue({});

            const newState = await Actions.deleteComment({
                state,
                api: mockApi as GhostApi,
                data: commentToDelete,
                socket: mockSocket,
            });

            expect(newState.comments.length).toBe(2);
            expect(newState.commentCount).toBe(1);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "updateCommentCount",
                1,
                "post-id"
            );
        });
    });
});

// Tests for ActionHandler function

describe("ActionHandler", () => {
    it("should call the corresponding action handler", async () => {
        const mockHandler = vi.fn().mockReturnValue({ updatedState: true });
        const mockData = { someData: "data" };
        const mockState = { someState: "state" };
        const mockApi = {} as GhostApi;
        const mockAdminApi = {};
        const mockSocket = {};

        Actions.someAction = mockHandler;

        const result = await ActionHandler({
            action: "someAction",
            data: mockData,
            state: mockState,
            api: mockApi,
            adminApi: mockAdminApi,
            socket: mockSocket,
        });

        expect(mockHandler).toHaveBeenCalledWith({
            data: mockData,
            state: mockState,
            api: mockApi,
            adminApi: mockAdminApi,
            socket: mockSocket,
        });

        expect(result).toEqual({ updatedState: true });
    });
});
