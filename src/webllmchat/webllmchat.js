import * as webllm from '@mlc-ai/web-llm';

@customElement('dbs-webllmchat')
export class Webllmchat {

    /*************** WebLLM logic ***************/
    messages = []; availableModels = []; selectedModel = "";

    bound() {
        this.placeholder = "Type a message..."
        this.chatclass = "chat-stats hidden";
        this.availableModels = webllm.prebuiltAppConfig.model_list.map(
            (m) => m.model_id,
        );
        this.selectedModel = "Qwen3-1.7B-q4f16_1-MLC";
        this.messages = [
            {
                content: "You are a helpful AI agent helping users.",
                role: "system",
            }];
        this.engine = new webllm.MLCEngine();
        this.engine.setInitProgressCallback(this.updateEngineInitProgressCallback);
        this.isdisabled = true;

    }

    clickDownload() {
        this.initializeWebLLMEngine().then(() => {
            this.isdisabled = false;
        });
    }

    clickSend() {
        this.onMessageSend();
    }


    attached() {
        /*************** UI binding ***************/
        this.availableModels.forEach((modelId) => {
            const option = document.createElement("option");
            option.value = modelId;
            option.textContent = modelId;
            this.modelSelection.appendChild(option);
        });
        //document.getElementById("model-selection").value = selectedModel;
    }
    // Callback function for initializing progress
    updateEngineInitProgressCallback(report) {
        this.reportText = report.text;
        console.log("initialize", report.progress);
        //document.getElementById("download-status").textContent = report.text;
    }

    // Create engine instance
    dsclass = "hidden";

    async initializeWebLLMEngine() {
        this.dsclass = "";//document.getElementById("download-status").classList.remove("hidden");
        //this.selectedModel = document.getElementById("model-selection").value;
        const config = {
            temperature: 1.0,
            top_p: 1,
        };
        console.log("Initializing model:", this.selectedModel);
        await this.engine.reload(this.selectedModel, config);
    }

    async streamingGenerating(messages) {//, onUpdate, onFinish, onError) {
        //updateLastMessage,            onFinishGenerating,            console.error,        );
        try {
            this.curMessage = "";
            completion = await engine.chat.completions.create({
                stream: true,
                messages,
            });
            for await (const chunk of this.completion) {
                const curDelta = chunk.choices[0].delta.content;
                if (curDelta) {
                    this.curMessage += curDelta;
                }
                this.updateLastMessage(this.curMessage);
            }
            const finalMessage = await engine.getMessage();

            this.onFinishGenerating(finalMessage);
        } catch (err) {
            console.error(err);
        }
    }

    /*************** UI logic ***************/
    onMessageSend() {
        //const input = document.getElementById("user-input").value.trim();
        this.input = this.userinput.trim()
        const message = {
            content: this.input,
            role: "user",
        };

        if (this.input.length === 0) {
            return;
        }
        this.isdisabled = true;

        this.messages.push(message);
        this.appendMessage(message);

        this.userinput = "";//document.getElementById("user-input").value = "";
        this.placeholder = "Generating...";

        const aiMessage = {
            content: "typing...",
            role: "assistant",
        };
        this.appendMessage(aiMessage);

        this.streamingGenerating(
            messages);//,            updateLastMessage,            onFinishGenerating,            console.error,        );
    }
    onFinishGenerating(finalMessage) {
        this.updateLastMessage(finalMessage);
        this.isdisabled = false;
        this.engine.runtimeStatsText().then(statsText => {
            this.chatclass = "chat-stats";//document.getElementById('chat-stats').classList.remove('hidden');
            document.getElementById('chat-stats').textContent = statsText;
        })
    }

    appendMessage(message) {
        const chatBox = document.getElementById("chat-box");
        const container = document.createElement("div");
        container.classList.add("message-container");
        const newMessage = document.createElement("div");
        newMessage.classList.add("message");
        newMessage.textContent = message.content;

        if (message.role === "user") {
            container.classList.add("user");
        } else {
            container.classList.add("assistant");
        }

        container.appendChild(newMessage);
        chatBox.appendChild(container);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the latest message
    }

    updateLastMessage(content) {
        const messageDoms = document
            .getElementById("chat-box")
            .querySelectorAll(".message");
        const lastMessageDom = messageDoms[messageDoms.length - 1];
        lastMessageDom.textContent = content;
    }


}