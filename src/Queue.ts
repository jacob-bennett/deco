export class Queue<T> {
  #head: Node<T> | undefined;
  #tail: Node<T> | undefined;
  length: number = 0;

  enqueue(value: T): void {
    this.length++;
    const node = new Node(value);

    if (!this.#tail) {
      this.#head = node;
      this.#tail = node;
      return;
    }

    this.#tail.next = node;
    this.#tail = node;
  }

  dequeue(): T {
    if (!this.#head) {
      throw new Error("Cannot pull value from an empty queue");
    }

    this.length--;

    const { value } = this.#head;
    this.#head = this.#head.next;

    if (!this.#head) {
      this.#tail = undefined;
    }

    return value;
  }
}

class Node<T> {
  value: T;
  next: Node<T> | undefined;
  constructor(value: T) {
    this.value = value;
  }
}
