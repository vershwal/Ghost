import { setupSocketConnection } from "./socket-connection";
import { io } from "socket.io-client";

vi.mock("socket.io-client");

const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn(),
};

io.mockReturnValue(mockSocket);

describe("setupSocketConnection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("should join the comment count room on socket connection", () => {
        const updateCommentCount = vi.fn();
        const socket = setupSocketConnection({
            url: "http://localhost:3000",
            postId: "my-post-id",
            updateCommentCount,
        });

        expect(io).toHaveBeenCalledTimes(1);
        expect(io).toHaveBeenCalledWith("http://localhost:3000");

        expect(socket.emit).toHaveBeenCalledTimes(1);
        expect(socket.emit).toHaveBeenCalledWith(
            "joinCommentCountRoom",
            "my-post-id"
        );
    });

    test("should call the provided callback when comment count is updated", () => {
        const updateCommentCount = vi.fn();
        setupSocketConnection({
            url: "http://localhost:3000",
            postId: "my-post-id",
            updateCommentCount,
        });

        expect(mockSocket.on).toHaveBeenCalledTimes(1);
        expect(mockSocket.on).toHaveBeenCalledWith(
            "updateCommentCount",
            expect.any(Function)
        );

        const [, onCommentCountUpdate] = mockSocket.on.mock.calls[0];

        onCommentCountUpdate(5, "my-post-id");

        expect(updateCommentCount).toHaveBeenCalledTimes(1);
        expect(updateCommentCount).toHaveBeenCalledWith(5, "my-post-id");
    });
});
